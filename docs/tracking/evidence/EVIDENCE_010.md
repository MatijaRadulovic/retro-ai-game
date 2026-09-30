# Evidence 010 — Gemini Hint Reliability V2

## Record and task context

- **Purpose / accepted goal:** add sanitized per-attempt telemetry, separate structured-output failure coverage, safe `Retry-After` handling, and a Gemma 4 final fallback with 1/2/3 attempts.
- **Governing spec/task plan:** [Gemini Hint Changes V2](../../specs/GEMINI_HINT_CHANGES_V2.md) and [Shop AI Advisor](../../../specs/002-shop-advisor/spec.md).
- **Exact prompt artifact and version:** [Gemini Hint Changes build prompt v2](../../prompts/week4/BUILD_PROMPT_GEMINI_HINT_CHANGES_V2.md) plus the current user request.
- **Starting source/revision or working-tree state:** existing uncommitted shop-advisor implementation and documentation on `main`; unrelated/user changes were preserved.
- **Sources actually used:** user request; project instructions; provider addendum; current feature, source, tests, and Evidence 009; official Google Gemini API, Gemma 4, pricing, structured-output, rate-limit, and troubleshooting documentation viewed 2026-09-30.
- **Relevant sources excluded and why:** no secret-file contents and no credential were read; live provider/account data were excluded because the user did not opt into a live call.
- **Conflict priority and risks:** the current request changes the earlier two-primary/three-fallback policy. Account-specific model availability and live latency cannot be established offline.
- **Scope / out of scope:** server adapters/orchestration/telemetry, focused tests, and owning docs. Game rules, purchases, UI flow, deployment, and live calls remain out of scope.

## Baseline

- `npm run typecheck`: exit 0.
- `node --test tests/shopAdvice.test.ts`: exit 0; 18 tests passed, 0 failed.
- The existing chain is two `gemini-3.8-flash` attempts then three `gemini-3.5-flash-lite` attempts under 65 seconds.
- No Gemma adapter or per-attempt telemetry exists. `Retry-After` is capped at five seconds even when the provider requests a longer wait.
- Output tests combine blocked and malformed responses rather than separately proving all four required output failure layers.

## Frozen eval scenarios and before/after results

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| V2-E1 | Flash succeeds | One Flash call and one sanitized success event | Partial: call succeeds; no event | Pass | Success telemetry test verifies normalized usage and unchanged state. |
| V2-E2 | Eligible failures exhaust all models | Exact order: Flash ×1, Flash-Lite ×2, Gemma ×3; bounded deadline | Fail: old 2/3 chain | Pass | Exact six-attempt order and kinds are asserted; hanging transport remains bounded. |
| V2-E3 | Gemma request | Separate text-JSON request branch and validated normalized output | N/A — capability absent | Pass | Fixture verifies Gemma URL, system instruction, text-JSON branch, output cap, and no native response schema. |
| V2-E4 | Empty, invalid JSON, schema-invalid, semantic-invalid output | Each case tested separately; one call; safe unavailable | Partial | Pass | Four separately named tests assert distinct internal error classes and no fallback. |
| V2-E5 | `429 Retry-After` fits local budget | Wait at least requested duration, then retry eligible model | Partial | Pass | A two-second header produces a two-second wait before the next approved model. |
| V2-E6 | `Retry-After` exceeds wait/deadline budget | Do not retry that model early; advance or fail safely | Fail: header capped and early retry possible | Pass | A 30-second header skips the remaining Flash-Lite attempt and advances to Gemma without an early retry. |
| V2-E7 | Attempt success/failure telemetry | One JSON-safe record per attempt with kind/model/status/latency/usage | N/A — capability absent | Pass | Success and six-failure sequences verify ordered records, model attempt limits, kinds, outcomes, latency, and usage. |
| V2-E8 | Telemetry privacy | No key, raw prompt/response, game ID, session ID, or private shop values | N/A — capability absent | Pass | Single-line JSON log is inspected for required fields and forbidden identifiers/content. |
| V2-E9 | Two transient Flash failures across requests | Open 15-minute primary congestion window; success resets count | Fail under one-attempt policy | Pass | Deterministic clocks prove cross-request failure accumulation, cooldown skip/expiry, and that Flash success resets the prior failure count. |
| V2-E10 | `401/403/400/409`, refusal, invalid output, cancellation | No fallback and stable safe result | Pass for representative terminal cases | Pass | Dedicated terminal-status, refusal, four output failures, and cancellation tests make one provider call. |

## Controlled change — iteration 1

- **Hypothesis / reason:** normalized adapter results and structured attempt events can add useful diagnostics while preserving the existing public and security boundaries.
- **Single bounded change:** added the three-model adapter/orchestration policy, structured telemetry, safe retry handling, and focused failure coverage described by the linked V2 plan.
- **Files changed:** `server/ai/shopAdvice.ts`, `server/ai/geminiTransport.ts`, `server/index.ts`, `src/ai/shopAdvice.ts`, focused HTTP/advisor tests, the V2 plan/prompt, and owning security/specification/tracking documents.
- **Out of scope preserved:** game state/economy/UI changes and live provider calls.

## After verification

- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 55 tests passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; Vite 6.4.3 transformed 9 modules and emitted `dist/index.html` plus CSS/JS assets.
- `npm run security:scan`: exit 0; no known credential patterns or client secret references found.
- `.githooks/pre-push origin https://github.com/umilutinovic25-hash/retro-ai-game.git </dev/null`: exit 0; no outgoing ref lines were supplied, so the guard scanned the worktree and 11 additional locally reachable commits; no known credential patterns or client secret references found.
- `git diff --check`: exit 0.
- Markdown relative-link scan: exit 0; 57 Markdown files checked.
- Automated tests remained offline. No key, secret-file content, live provider request, or browser manual session was used.

## Honest limitations

Offline fake-provider tests do not establish real Gemma availability, response quality, latency, or this account's rate limits. The selected `gemma-4-26b-a4b-it` model and free-tier availability are supported by official Google documentation as of 2026-09-30. The pre-push scanner detects known patterns and cannot prove the absence of every possible secret format.
