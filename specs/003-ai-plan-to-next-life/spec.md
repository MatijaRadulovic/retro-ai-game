# Feature Specification: AI Plan to Next Life

**Feature Branch**: `003-ai-plan-to-next-life`

**Created**: 2026-10-07

**Status**: Ready for planning

**Input**: User-approved [W05 prompt v1](../../docs/prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt), narrowed to planning first, followed by current user direction to use Spec Kit and keep the application in control of every tool/action and stop decision.

## User Scenarios & Testing

### User Story 1 — Compare ways to reach the next life (Priority: P1)

While the paused shop is open, a player requests a plan for the next +1 Life. The feature compares saving current points with buying exactly one affordable Extra XP level first. It tells the player which option reaches the real next-life price using fewer additional red food pickups, or says neither reaches it within the projection limit. The player decides whether to make a separate manual purchase.

**Why this priority**: It gives the player a bounded, evidence-based comparison for a specific shop decision.

**Independent Test**: Supply a controlled paused shop state and deterministic model proposals. Verify both strategies are evaluated when available, the result matches evaluator evidence and tie rules, and no canonical game state or purchase changes.

**Acceptance Scenarios**:

1. **Given** a paused shop, fewer points than the next-life price, and an affordable Extra XP level, **when** the player requests a plan, **then** both strategies are evaluated and a validated comparison is shown.
2. **Given** Extra XP is unaffordable or capped, **when** the player requests a plan, **then** only saving is evaluated and the unavailable strategy reason is grounded in current shop context.
3. **Given** enough points to buy the next life, **when** the request is made, **then** the application returns a direct result without a model call.
4. **Given** the maximum two life charges are held, **when** the request is made, **then** the application returns unavailable without a model call.
5. **Given** the final recommendation arrives, **when** the player chooses to buy, **then** only the existing separate purchase action can change the game.

### User Story 2 — Keep the agent under application control (Priority: P1)

The model proposes one structured next step from the options the application allows at the current phase. The application validates the message shape, phase, tool name, arguments, current game revision, limits and repeat status before deciding whether to execute anything. The application validates the tool result and decides whether the run continues, stops, or fails. The model cannot authorize its own proposal, add tools, set limits, declare success without evidence, choose the final strategy, or extend the run.

**Why this priority**: A model proposal is untrusted input. Only the application owns execution authority, evidence acceptance, final comparison and stop conditions.

**Independent Test**: Script unknown, malformed, premature, repeated and contradictory proposals/results. Verify rejected proposals execute zero tools, invalid results are not passed onward, the backend makes final selection from validated evidence, and each terminal path records a safe reason.

**Acceptance Scenarios**:

1. **Given** a valid tool proposal for the current phase, **when** all runtime checks pass and budget remains, **then** only that allowlisted tool executes with the validated arguments.
2. **Given** a malformed, unknown, out-of-phase, repeated, unauthorized or over-budget proposal, **when** it arrives, **then** it is not executed and the application applies the documented safe stop/recovery path.
3. **Given** a malformed, oversized, stale or semantically invalid tool result, **when** validation fails, **then** the result is not sent to the model or shown as evidence.
4. **Given** a valid model final that contradicts evaluator results or deterministic comparison rules, **when** the application validates it, **then** it is rejected and cannot override the application result.
5. **Given** any terminal condition, **when** the run reaches it, **then** the application stops further model/tool calls, records the reason, clears temporary state/locks and returns a safe status.

### User Story 3 — Recover safely from interruption and provider errors (Priority: P2)

If a provider attempt fails transiently, the run retries or falls back only under the existing approved Google policy and within the W05 run-wide budget. Terminal failures stop immediately. If the shop changes or the request is cancelled, no stale answer is displayed and pending work is stopped where possible. Existing ASK SHOP AI remains usable.

**Why this priority**: A multi-step run multiplies latency and failure paths; controlled recovery protects the shop and game.

**Independent Test**: Use a fake provider to exercise transient, terminal, timeout, deadline, cancellation, stale revision and existing-advisor regression cases without network credentials.

**Acceptance Scenarios**:

1. **Given** eligible transient provider failures, **when** retry/fallback occurs, **then** each attempt consumes the same global budget and total deadline.
2. **Given** authentication/configuration failure, refusal, invalid structured output or cancellation, **when** it occurs, **then** no prohibited retry/fallback follows.
3. **Given** purchase, resume, restart, shop close or revision change during a run, **when** an old result arrives, **then** it is discarded and never displayed as current.
4. **Given** any success or failure path, **when** it completes, **then** temporary run state and in-flight gates are cleared.
5. **Given** the new action is added, **when** the existing ASK SHOP AI route is used, **then** its contract, fallback policy and behavior remain unchanged.

### Edge Cases

- Current points already meet the 5-point first-life or 8-point second-life price.
- Player already holds two life charges, or holds one charge and is saving for the second.
- Extra XP is at level 5 or its next cost exceeds current points.
- Lucky pickup has already granted points; current unspent points include them, but future Lucky rewards are excluded from the projection.
- One red food XP award crosses more than one level threshold.
- Goal is reached exactly on food 100 or not reached within 100.
- Both plans tie; one alone reaches; neither reaches; model final invents or duplicates evidence IDs.
- Tool request has extra/missing fields, wrong `foodLimit`, wrong phase, unknown tool, repeated canonical call, oversized output or invalid semantics.
- Provider transient failure across multiple agent steps consumes the entire run-wide attempt limit; terminal failure, deadline, cancellation or stale state stops the run.
- The two AI actions are requested concurrently; neither may create unbounded or overlapping model work for one game.
- Browser abort through the Vite proxy may not immediately abort backend transport; stale output suppression and the backend deadline still apply.

## Requirements

### Functional Requirements

- **FR-001**: The paused shop MUST expose a separate `PLAN DO +1 LIFE` action while preserving `ASK SHOP AI`.
- **FR-002**: The goal MUST be fixed. The browser MUST send only the game ID using the existing route pattern and an empty JSON object; it MUST NOT send a prompt, model, strategy context, game facts or action.
- **FR-003**: The application MUST reject unknown games, non-paused games, malformed/nonempty bodies, overlapping AI work and maximum life charges before any provider call. If the next life is currently affordable, it MUST return a deterministic application result with zero provider/tool calls.
- **FR-004**: The only strategies MUST be `save_for_life` and `buy_extra_xp_then_save`. Strategy B MUST hypothetically purchase exactly one next Extra XP level at its actual current cost and MUST be unavailable when unaffordable or capped. No other perk or chained purchase may be modeled.
- **FR-005**: The application MUST use a consistent beginning-of-run shop snapshot and the actual level, XP, perk-point, Extra XP and next-life pricing rules. It MUST include every level crossed by one XP award and use actual unspent points, including already earned Lucky points.
- **FR-006**: Projection MUST be limited to 100 additional red food pickups. It MUST assume no collisions/life consumption, no future Lucky rewards and no other purchases. It MUST describe the result as a bounded projection, not real time, survival probability or guaranteed outcome. Failure to reach by food 100 MUST mean only “not reached within limit.”
- **FR-007**: The only tools MUST be read-only `get_shop_context` and deterministic local `evaluate_plan`; both MUST use exact runtime-validated schemas, the run-bound context, an allowlist, a maximum 8 KiB result and a 100 ms local budget. They MUST not access network/files or mutate canonical state, revision, RNG or timers.
- **FR-008**: Each model response MUST contain exactly one structured tool proposal or one final proposal, never multiple or extra fields. The application MUST validate parse/shape, enum, current phase, allowlist, arguments, game ownership/context, revision, limits and repeated action before execution. Invalid/rejected proposals MUST execute zero tools.
- **FR-009**: The model MUST propose the next allowed tool and strategy evaluation; the application MUST NOT precompute tool calls and falsely attribute them to the model. The application MUST gate every proposed action using its own run state machine and fixed policy; model output is never execution authority.
- **FR-010**: The application MUST validate every tool result for exact shape, legal values, size, freshness and semantic consistency before adding it to model context or evidence. A rejected result MUST NOT be used as proof or forwarded as trusted data.
- **FR-011**: The application MUST decide whether to continue, stop, retry, fall back or fail. It MUST enforce at most 4 model steps, 3 executed tools, 6 provider attempts across the entire run, 10 seconds per attempt and a 30 second total deadline. Retries MUST consume the same global attempt budget and MUST NOT increment the agent-step count.
- **FR-012**: The application MUST stop on invalid/out-of-phase/repeated proposals, invalid tool results, terminal provider failures, exhausted limits, deadline, cancellation or stale game state. It MUST use a finite safe recovery policy for eligible transient failures and MUST NOT retry an invalid proposal/result or restart already executed workflow steps.
- **FR-013**: The backend MUST derive every tool input from the run snapshot. The model MUST never provide XP, prices, game ID/revision, state, formulas, filesystem paths, URLs or provider IDs as tool arguments.
- **FR-014**: The final model proposal MUST reference current-run evidence IDs and use an exact schema. The application MUST validate those IDs, their relevance, availability, the shop revision and the result against deterministically recalculated outcomes. The application owns final decision selection; model final output cannot override it.
- **FR-015**: If both strategies reach the goal, the application MUST select fewer foods, breaking ties in favor of saving. If only one reaches, select it; if neither reaches, return incomplete without a winning recommendation. If B is unavailable, recommend A only if A reaches the goal.
- **FR-016**: Public outcomes MUST distinguish completed, incomplete, unavailable, stale and cancelled cases in a stable safe response. User-facing numbers, comparison and assumptions MUST be generated from validated application values, not free-form model prose.
- **FR-017**: Every run MUST have explicit application-owned state and terminal reason, a per-game gate shared with ASK SHOP AI, bounded context and temporary in-memory lifetime. Locks and run data MUST be cleared on every exit path.
- **FR-018**: A purchase, resume, restart, shop close, changed revision or cancellation MUST make a pending answer stale/cancelled; it MUST never be displayed as current. The feature MUST NOT buy perks or change game state.
- **FR-019**: Telemetry MUST distinguish logical run, model step, provider attempt and tool call using only anonymous ID, counts, tool names, safe status, duration and stop reason. It MUST exclude game/session IDs, raw context/prompt/response, shop values, credentials and chain-of-thought.
- **FR-020**: The feature MUST use only the existing server-selected Google model chain and server-side credential boundary. It MUST NOT add provider/model choice, write tools, arbitrary dispatch, shell/filesystem/network tools, persistence, multiplayer, frameworks or broad refactoring.
- **FR-021**: Automated tests MUST cover success, boundary, invalid proposal/result, semantic rejection, provider recovery, total budget/deadline, stale/cancel cleanup, state invariance and ASK SHOP AI regression with fake providers and deterministic time.

### Key Entities

- **Agent Run**: One temporary, application-owned analysis with game/revision binding, phase, counters, deadline, cancellation, tool results, evidence IDs and terminal reason.
- **Tool Proposal**: One untrusted model request whose name, arguments and phase must pass application validation before execution.
- **Shop Context**: Minimal progression and perk facts captured from one authoritative paused-game snapshot.
- **Plan Evaluation**: Deterministic projection for one permitted strategy and bounded food limit, with server-generated evidence ID and explicit assumptions.
- **Final Proposal**: Untrusted model reference to run evidence; the application independently validates and selects the final recommendation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Every normal fake success uses exactly four model steps and three tool executions; the Extra XP-unavailable path uses three steps and two tool executions.
- **SC-002**: Direct preflight for already affordable life or maximum life charges makes zero provider and tool calls.
- **SC-003**: 100% of unknown, malformed, out-of-phase, repeated or over-budget tool proposals execute zero tools.
- **SC-004**: 100% of displayed recommendations match validated current-run evaluation evidence and the deterministic comparison/tie policy.
- **SC-005**: The evaluator reaches the same XP/level/point results as game rules across threshold boundaries, multi-level awards and both life prices; reaching food 100 is distinguished from not reaching within the limit.
- **SC-006**: No run exceeds 4 model steps, 3 tool calls, 6 total provider attempts, 10 seconds per provider attempt or 30 seconds total.
- **SC-007**: Success, error, cancellation, deadline and stale-state exits all clear run locks and never change authoritative game state, revision, RNG or timers.
- **SC-008**: Existing ASK SHOP AI tests and API behavior pass unchanged after the new flow is introduced.
- **SC-009**: User-visible output contains only validated outcomes, safe assumptions and high-level status; no raw provider/tool content or internal reasoning is exposed.

## Assumptions

- The feature is a separate action in the existing paused shop and may run only while game status is paused.
- “As soon as possible” means the fewest additional red food pickups under the stated projection assumptions.
- Each level gained grants one perk point. Current XP awards, thresholds, prices and caps are source-of-truth and will be verified during implementation.
- The model may propose a strategy/tool only from the state-machine phase's allowed set. The backend is the gatekeeper and owns execution, final selection and termination. The player retains the separate decision to purchase; the AI never makes or executes that purchase.
- All run state is temporary and process-local; no persistence is required.
- Existing W04 fallback policy remains in force per step, bounded additionally by the stricter global W05 attempt and time limits.

## Out of Scope

- Automatic purchase, any write-capable tool or mutation of game state.
- Free-form chat, custom user goal, arbitrary model/provider, or model-controlled limit/stop configuration.
- Luck or other perk strategies, multiple Extra XP purchases, collision/survival probabilities or real-time estimates.
- Arbitrary network, browser, filesystem, shell, SQL or repository access; persistent agent sessions; multiplayer; RAG; streaming infrastructure; unrelated refactors/assets/frameworks.
- Live provider tests without explicit authorization, deployment, push or publishing as part of the planning phase.
