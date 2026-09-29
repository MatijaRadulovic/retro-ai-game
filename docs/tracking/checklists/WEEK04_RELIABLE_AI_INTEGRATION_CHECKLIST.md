# Week 4 Reliable AI Integration — Review Checklist

Use this checklist to assess the Week 4 assignment against RETRO SNAKE. Each item starts **Pending**; change status only after checking the current files or running the relevant verification. The checklist separates project acceptance from generic course requirements that conflict with this repository's approved scope.

> **Scope update:** This checklist records the earlier mock-Hint review. The user has since authorized one server-side Gemini Hint. Its current acceptance criteria are in [`GEMINI_HINT_INTEGRATION.md`](../../specs/GEMINI_HINT_INTEGRATION.md); the old N/A entries below describe the prior review and do not prohibit that scoped change.

## Project authority and status key

- `AGENTS.md`, `docs/specs/BASE_GAME_SPEC.md`, `docs/specs/TOOL_CONTRACT.md`, and [`GEMINI_HINT_INTEGRATION.md`](../../specs/GEMINI_HINT_INTEGRATION.md) define the current project boundary. The Week 3 prompt is historical mock-only context.
- The course assignment is broader and describes live-provider/backend integration. Those instructions are course requirements, not authority to override this repo.
- **Status key:** Pending = not checked in this review; Verified = inspected or tested with evidence; N/A — prior scope = excluded under the mock-only contract before the scope update above.
- Existing `EVIDENCE_004.md` contains historical test claims. Reconfirm them before describing them as current results.

## A. Keep the Week 3 game stable

- [ ] **Pending** — Core Snake remains playable and matches the 20 × 20 game specification.
- [ ] **Pending** — Existing typecheck, tests, and build start from a known state; any pre-existing failure is recorded before edits.
- [ ] **Pending** — AI Hint remains outside the real-time game loop and is user-triggered.
- [ ] **Pending** — No change to deterministic game rules is needed for the Hint flow.

## B. Define one useful, bounded scenario

- [ ] **Pending** — The user action, timing, input, expected response, and user benefit are stated clearly.
- [ ] **Pending** — The Hint receives only the minimum game facts required by its task.
- [ ] **Pending** — Success and failure behavior are defined before implementation.
- [ ] **Pending** — The Hint is advice only; the user or game controls movement and all state changes.
- [ ] **Pending** — Scope stays at one user-triggered Gemini Hint flow; no replay analysis, second provider/tool, or unrelated AI feature is added.

## C. Contract and trust boundary

- [ ] **Pending** — The single allowlisted tool is `get_game_state`, called only from the Hint flow.
- [ ] **Pending** — Input accepts exactly `{ detail: "summary" | "tactical" }`; extra keys, wrong values, and unknown tool names are rejected before execution.
- [ ] **Pending** — Invalid proposals produce zero tool calls; valid proposals use the expected arguments and bounded call count.
- [ ] **Pending** — The snapshot contains only the fields permitted by `docs/specs/TOOL_CONTRACT.md` and does not expose full snake body, source, secrets, local storage, or unrelated browser/app data.
- [ ] **Pending** — The tool and Hint flow cannot mutate score, direction, snake, food, configuration, timer, game status, or restart state.
- [ ] **Pending** — Tool output is checked for shape, limits, and safe semantics before use.
- [ ] **Pending** — Final `HintResponse` fields, enums, and string limits are validated at runtime before display.
- [ ] **Pending** — Model/tool text is untrusted data, not an instruction or executable command.

## D. Failure behavior

- [ ] **Pending** — Invalid input, malformed tool/provider/final output, refusal, auth/config failure, timeout, and exhausted transient retries each fail safely.
- [ ] **Pending** — A failure never becomes a fabricated successful hint or changes game state.
- [ ] **Pending** — UI presents a stable, clear local message without stack trace, raw payload, or secret.
- [ ] **Pending** — Failure handling does not make repeated calls or leave the UI stuck.
- [ ] **Pending** — The game remains usable when the Hint flow fails.

## E. Offline test matrix and evidence

- [ ] **Pending** — Fake transport tests cover valid Gemini request/response mapping, expected input/output, and exact call count without network or key.
- [ ] **Pending** — Invalid arguments and unsupported tool names assert `callCount === 0`.
- [ ] **Pending** — Malformed tool output and malformed `HintResponse` are rejected.
- [ ] **Pending** — Fake-model failure produces the safe fallback.
- [ ] **Pending** — A state-invariance test proves the Hint path does not mutate game state.
- [ ] **Pending** — Transient-only retry, two-attempt limit, total deadline, cancellation, and local fallback are covered.
- [ ] **Pending** — Browser source and build contain no credential reference/value; pre-push guard passes without reading secret files.
- [ ] **Pending** — Test fixtures are deterministic and require no key, network, or live account.
- [ ] **Pending** — [`EVIDENCE_004.md`](../evidence/EVIDENCE_004.md) records expected cases, observed results, actual commands/output, limits, and prompt/spec links.
- [ ] **Pending** — [`WORK_LOG.md`](../WORK_LOG.md) links this task to the relevant prompt/spec and evidence.
- [ ] **Pending** — AI usage and contributors are recorded accurately; no private chain-of-thought or credentials are included.
- [ ] **Pending** — Required implementation checks are run: `npm run typecheck`, `npm test`, and `npm run build`; actual outcomes are preserved.

## F. Course requirements excluded under the prior mock-only scope

These rows preserve the earlier mock-only review record. Their **N/A — prior scope** status is superseded for the single Gemini Hint by the approved plan above.

- [x] **N/A — project scope** — Frontend-to-TypeScript-backend split and AI endpoint.
- [x] **N/A — project scope** — Gemini/OpenAI provider integration, provider selection, live smoke test, model choice, and API key/environment configuration.
- [x] **N/A — project scope** — Real network timeout, HTTP status mapping, provider retry/backoff, cross-model/provider fallback, and live usage/token/cost telemetry.
- [x] **N/A — project scope** — Provider dashboard, quotas, caching, multi-model routing, and provider-neutral gateway.
- [x] **N/A — project scope** — Live provider result quality or latency claims.

The relevant lesson still applies offline: fake first, explicit contracts, strict validation, safe failure, privacy-safe evidence, and no claim beyond the test. The local fake-model error path is not a real provider timeout test.

## G. Week 4 stretch and out-of-scope work

- [x] **N/A — prior scope** — Usage dashboard, token accounting, second model/provider, or automatic alternate-model fallback.
- [x] **N/A — out of scope** — Agent loops, autonomous operation, RAG/vector database, write tool, multiplayer, backend, deployment, or AI in frame-by-frame game updates.

## Review result

- **Review date:**
- **Reviewer:**
- **Verified sections/items:**
- **Failures or gaps:**
- **Evidence link(s):**
- **Decision / next step:**
