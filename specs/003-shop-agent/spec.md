# Feature Specification: Shop Strategist (Bounded Agentic Feature)

**Feature directory**: `003-shop-agent` (branch `week05-shop-agent`)
**Created**: 2026-10-07
**Status**: Draft for review (design approved in chat 2026-10-07; implementation plan not yet written)
**Input**: Week 05 assignment "Bounded Agentic Feature" and its reliable-workflow addendum. Continues W03 game + W04 shop advisor; does not replace the advisor.

Companion documents: [agent flow](agent-flow.md), [tool contracts](contracts/tool-contracts.md), [HTTP contract](contracts/shop-agent-api.md), [frozen evals](evals.md).

## Summary

W04 answers one question with one model call: "buy X or wait?". W05 adds a **goal-driven run** in the paused shop: the player asks the Strategist to *plan the next perk purchases*. The model may only **propose** read-only tool calls; the backend validates each proposal, executes allowed tools, validates results, and returns them to the model. After at least two model steps and one real tool execution, the model returns a structured plan with evidence, which the backend validates again before the UI shows it. The Strategist never buys, moves, pauses or restarts anything.

> The model proposes. The application decides.

## User Scenarios & Testing

### User Story 1 — Plan next purchases (P1, Core)

A player with some perk points opens the shop and presses **ASK STRATEGIST**. The run reads the shop state, evaluates a candidate purchase sequence with a deterministic evaluator, and shows a short plan (0–3 purchases) with evidence. Nothing is bought.

**Independent test**: fake gateway script `get_shop_state → evaluate_perk_plan → final`; assert 3 model steps, 2 tool executions, validated result, unchanged game revision.

**Acceptance scenarios**

1. **Given** a paused shop with points for at least one perk, **when** the run completes, **then** the result lists a plan of 1–3 perks that the evaluator marked valid, evidence naming executed tools, a confidence level, and `completed: true`.
2. **Given** no perk is affordable, **when** the run completes, **then** the plan is empty, the summary says to save points, and no purchase is suggested.
3. **Given** all perks are capped, **when** the run completes, **then** the plan is empty and the reason is the cap.
4. **Given** the run is in progress and the player buys a perk, closes the shop or restarts, **when** the result arrives, **then** it is discarded (revision check).
5. **Given** the model emits `final` before any tool executed, **then** the step is rejected (`invalid_model_proposal`): no evidence, no final.

### User Story 2 — Learn from recent games (P2, layer 2, option O1)

The Strategist can also call `get_recent_runs` to see the last 1–5 finished games of this game container and tailor the plan (for example, favour +1 Life if recent games ended by collision at a low level).

**Independent test**: seed history, run with fake script using `get_recent_runs`; assert the tool is limited to ≤5 entries of this game only and the final evidence references it. With empty history the agent must not claim anything about past games.

**Acceptance scenarios**

1. **Given** two finished games in this container, **when** `get_recent_runs {limit:2}` runs, **then** exactly those two summaries are returned.
2. **Given** no finished games, **when** it runs, **then** the result is `{runs: []}` and a final that cites past-game facts is rejected by semantic validation.
3. **Given** `limit` is 0, 6, a string or missing, **then** the call is rejected before execution.

### User Story 3 — Revise a rejected plan once (P3, layer 3, option O7)

If `evaluate_perk_plan` reports failures for the candidate (unaffordable step, capped perk), the model receives the evaluation and may propose **one** corrected plan, which is evaluated again before it can be final.

**Independent test**: fake script proposes an unaffordable plan, receives failures, proposes a valid plan; assert exactly two evaluator calls and a valid final. A third evaluator call is refused (`tool_call_limit` or evaluator cap).

### User Story 4 — Safe failure and boundaries (P1, Core)

Every failure ends in a classified stop reason, a safe user message, and an unchanged game. Unknown tools, bad arguments, repeated calls, budgets and deadlines are enforced by the application, never by the model.

**Acceptance scenarios**: see FR-006…FR-020 and [evals.md](evals.md).

### Edge cases

- Perk rules come from the authoritative engine: Extra XP and Luck level 0–5, cost = current level + 1; +1 Life 0–2 held charges, cost 5 then 8; lucky pickups can add points without a level change (use the actual unspent balance).
- `stateVersion` is the game `revision`; a changed revision during a run makes the result stale.
- Game statuses are `ready | playing | paused | game_over | won`; only `paused` may start a run.
- Free-tier keys can rate limit (429) quickly; live testing is minimal by design.

## Requirements

### Functional requirements

**Run and boundary**

- **FR-001**: One user action = one logical run with a server-generated random `runId` (not the game ID).
- **FR-002**: The player's goal is a fixed enum, currently only `plan_next_purchases`. Free text from the player is not accepted, so player input cannot inject instructions.
- **FR-003**: Preflight rejects, before any provider call: unknown game (404), non-paused game (409), non-object body or extra fields (400), and an already active run for that game (safe `busy`).
- **FR-004**: The agent loop runs only on the backend. The browser never receives keys, prompts, raw provider output or tool internals.
- **FR-005**: The agent is read-only. It cannot call `/perks`, `/move`, `/pause`, `/resume`, `/restart`, publish a revision, touch the network, filesystem or shell.

**Model protocol**

- **FR-006**: Each model step returns exactly one JSON envelope: `{"kind":"tool_request","tool":<name>,"arguments":{...}}` or `{"kind":"final","result":{...}}`. Extra fields, other kinds, or non-JSON are `invalid_model_proposal`/`invalid_structured_response`. The same envelope is used for all models in the chain (Gemma has no native structured output, so native function calling is not used).
- **FR-007**: The model is untrusted. A structurally valid proposal is still checked against the allowlist, argument schema, current step budget and repeat key before execution.
- **FR-008**: `final` is accepted only after at least one tool executed in this run and, for a non-empty plan, only if that exact plan was evaluated `valid` by `evaluate_perk_plan` in this run.

**Tools** (details in [tool contracts](contracts/tool-contracts.md))

- **FR-009**: The allowlist is in code: `get_shop_state` and `evaluate_perk_plan` (Core), `get_recent_runs` (layer 2). The model cannot define tools, URLs, paths, SQL or shell commands.
- **FR-010**: Tool arguments are validated strictly (exact keys, enum, bounds) before execution. A rejected proposal executes nothing: `toolCallCount` is unchanged for that proposal.
- **FR-011**: Tool results are validated (shape, size ≤ `maxToolResultBytes`, allowed values, no secrets, no unneeded internal state) before they are added to the next model context. Invalid → `tool_failed`.

**Limits and stop conditions** (values in [agent-flow.md](agent-flow.md))

- **FR-012**: Every run has explicit `maxAgentSteps`, `maxToolCalls`, `maxEvaluatorCalls`, `maxAttemptsPerStep`, `maxProviderAttempts`, `maxProviderFallbacks`, per-call timeout, and total deadline. A "step" is one model decision; a "provider attempt" is one HTTP call. Retries and fallbacks consume `maxProviderAttempts` shared by the whole run, so budgets cannot multiply.
- **FR-013**: Repeat detection key is `toolName + normalizedArguments + stateVersion`. A second proposal with the same key stops the run with `repeated_action`.
- **FR-014**: Stop reasons are exactly: `completed`, `invalid_model_proposal`, `unknown_tool`, `invalid_tool_arguments`, `tool_failed`, `provider_failed`, `step_limit`, `tool_call_limit`, `deadline`, `repeated_action`, `cancelled`, `stale`. The stop decision belongs to the orchestrator, never only to the model.
- **FR-015**: A dropped client connection aborts in-flight provider work and ends the run as `cancelled` (terminal state).

**Reliability**

- **FR-016**: The provider chain is the existing server-owned allowlist (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemma-4-26b-a4b-it`). No arbitrary model IDs; no new provider. A model that answered a step stays selected for later steps of the run unless it fails.
- **FR-017**: Failure classification reuses W04 `ProviderFailure`. Authentication/permission/bad-request: no retry. Rate limit, timeout, 5xx, network: bounded retry or fallback within shared budgets and deadline. Refusal, empty output, invalid JSON, schema-invalid: no fallback to evade it; the step is rejected.
- **FR-018**: Tools are pure and read-only, so retrying a model step can never duplicate a side effect.

**Final result**

- **FR-019**: The final result is `{summary, plan, evidence, confidence, completed}` (see [tool contracts](contracts/tool-contracts.md#final-result)). The backend validates: schema, `plan` ⊆ evaluated-valid plan, every `evidence.source` is a tool executed in this run, `evidence.step` points to a real tool result, lengths are bounded, and `completed:true` is justified by evidence. Invalid final → `invalid_model_proposal`, never shown as success. A final with `completed: false` is also rejected as an unusable result.
- **FR-020**: Text shown to the player is rendered with `textContent`; `summary` and `evidence.finding` are bounded plain text from the model and are never interpreted as commands. The recommended plan line is built by the server from the validated plan and evaluator output.

**Observability and privacy**

- **FR-021**: Each run records a sanitized run log: `runId`, per step number, provider, model, latency, tool name, validation status, token usage when available, `stopReason`, `providerAttempts`, `toolCalls`, elapsed time. No keys, raw prompts, raw provider payloads, game IDs or chain-of-thought.
- **FR-022**: Public responses contain only the safe statuses defined in the [HTTP contract](contracts/shop-agent-api.md). No stack traces or provider errors.
- **FR-023**: Tool results and any text derived from game data are data, never instructions: they cannot change the allowlist, limits or system prompt.

**Project contract changes**

- **FR-024**: Implementation MUST update `AGENTS.md` and `docs/specs/TOOL_CONTRACT.md`, which currently say Gemini does not propose tool calls, to allow the bounded read-only tool-proposal flow and keep "no write-capable tools" and "no arbitrary model IDs".
- **FR-025**: W04 shop advice (`/shop-advice`) behaviour and tests remain unchanged.

### Key entities

- **AgentRun**: runId, goal, status (`running|completed|stopped|failed`), stepCount, toolCallCount, evaluatorCallCount, providerAttempts, startedAt, deadlineAt, recentActionKeys, stateVersion, stopReason, steps[].
- **AgentStep**: index, model, decision (`tool_request|final|rejected`), tool, validation status, latency, usage.
- **RunHistoryEntry** (layer 2, in memory, per game container, last 5): score, level, perksAtEnd {extraXp level, luck level, +1 Life charges still held}, endedBy (`game_over|won|restart`).
- **AgentResult**: see tool contracts.

## Success criteria

- **SC-001**: Success run shows ≥2 model steps and ≥1 tool execution, and a validated structured result.
- **SC-002**: For every rejected/invalid/failed path, `toolCallCount` after the rejected proposal equals the count before it, and the game revision is unchanged.
- **SC-003**: Every automated agent test runs with a fake gateway and no network. The full suite and `npm run security:scan` pass.
- **SC-004**: A run can never exceed `maxAgentSteps`, `maxToolCalls`, `maxProviderAttempts` or the deadline (tested).
- **SC-005**: At most 15 live runs during development and 3 for the demo; live results are recorded as date, status, duration, steps, tool calls and classified outcome only.

## Out of scope

General autonomous agent, free-text goals, write or purchase actions (and human-approval write flows), browser/shell/filesystem/web tools, RAG, vector DB, multi-agent, more than 5 model steps, background daemon, cross-provider comparison, UI for cancelling a run, persistent storage of run history or run logs, changing game rules, a new provider, shared congestion marker between W04 advisor and the agent.

## Assumptions and open items for the plan

- Layer 2 records history inside `GameSessionManager` when a game reaches `game_over`/`won` or is restarted after play. The exact hook points are confirmed in the plan, with tests, before implementation.
- Initial limit values are conservative for a free-tier key and may be tuned from the evidence, with the change documented.
- Observability UI (option O6) is not selected; the UI shows only the safe status line, the validated result, and the stop reason category.
