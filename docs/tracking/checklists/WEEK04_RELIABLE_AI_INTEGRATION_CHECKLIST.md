# Week 4 Reliable AI Integration — Review Checklist

Use this checklist to assess the Week 4 assignment against RETRO SNAKE. Each item starts **Pending**; change status only after checking the current files or running the relevant verification. The checklist separates project acceptance from generic course requirements that conflict with this repository's approved scope.

## Project authority and status key

- `AGENTS.md`, `docs/specs/GAME_SPEC.md`, `docs/specs/TOOL_CONTRACT.md`, and `docs/prompts/BUILD_PROMPT_HINTS-MOCK.md` define the current project boundary.
- The course assignment is broader and describes live-provider/backend integration. Those instructions are course requirements, not authority to override this repo.
- **Status key:** Pending = not checked in this review; Verified = inspected or tested with evidence; N/A — project scope = intentionally excluded by the current project contract.
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
- [ ] **Pending** — Scope stays at one local AI Hint flow; no replay analysis, ticket classification, second tool, or unrelated AI feature is added.

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

- [ ] **Pending** — Unknown tool, invalid input, malformed tool output, malformed final output, and fake-model failure each fail safely.
- [ ] **Pending** — A failure never becomes a fabricated successful hint or changes game state.
- [ ] **Pending** — UI presents a stable, clear local message without stack trace, raw payload, or secret.
- [ ] **Pending** — Failure handling does not make repeated calls or leave the UI stuck.
- [ ] **Pending** — The game remains usable when the Hint flow fails.

## E. Offline test matrix and evidence

- [ ] **Pending** — Fake/mock tests cover a valid Hint with expected input, output, and call count.
- [ ] **Pending** — Invalid arguments and unsupported tool names assert `callCount === 0`.
- [ ] **Pending** — Malformed tool output and malformed `HintResponse` are rejected.
- [ ] **Pending** — Fake-model failure produces the safe fallback.
- [ ] **Pending** — A state-invariance test proves the Hint path does not mutate game state.
- [ ] **Pending** — Test fixtures are deterministic and require no key, network, or live account.
- [ ] **Pending** — [`EVIDENCE_004.md`](../evidence/EVIDENCE_004.md) records expected cases, observed results, actual commands/output, limits, and prompt/spec links.
- [ ] **Pending** — [`WORK_LOG.md`](../WORK_LOG.md) links this task to the relevant prompt/spec and evidence.
- [ ] **Pending** — AI usage and contributors are recorded accurately; no private chain-of-thought or credentials are included.
- [ ] **Pending** — Required implementation checks are run: `npm run typecheck`, `npm test`, and `npm run build`; actual outcomes are preserved.

## F. Course requirements intentionally excluded by current project scope

These are present in the generic Week 4 assignment. Their status here is **N/A — project scope**, not a hidden implementation defect. Do not implement them without an explicit scope/spec change.

- [x] **N/A — project scope** — Frontend-to-TypeScript-backend split and AI endpoint.
- [x] **N/A — project scope** — Gemini/OpenAI provider integration, provider selection, live smoke test, model choice, and API key/environment configuration.
- [x] **N/A — project scope** — Real network timeout, HTTP status mapping, provider retry/backoff, cross-model/provider fallback, and live usage/token/cost telemetry.
- [x] **N/A — project scope** — Provider dashboard, quotas, caching, multi-model routing, and provider-neutral gateway.
- [x] **N/A — project scope** — Live provider result quality or latency claims.

The relevant lesson still applies offline: fake first, explicit contracts, strict validation, safe failure, privacy-safe evidence, and no claim beyond the test. The local fake-model error path is not a real provider timeout test.

## G. Week 4 stretch and out-of-scope work

- [x] **N/A — not selected** — Optional retry/fallback, usage dashboard, token accounting, second model/provider, or live play-test.
- [x] **N/A — out of scope** — Agent loops, autonomous operation, RAG/vector database, write tool, multiplayer, backend, deployment, or AI in frame-by-frame game updates.

## Review result

- **Review date:**
- **Reviewer:**
- **Verified sections/items:**
- **Failures or gaps:**
- **Evidence link(s):**
- **Decision / next step:**
