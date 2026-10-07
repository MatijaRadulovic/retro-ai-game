# Research — AI Plan to Next Life

**Date:** 2026-10-07

**Input:** [feature spec](spec.md), [original prompt v1](../../docs/prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt), current game and shop-advisor implementation. No live provider or external research was used.

## Decision 1 — Application owns all execution and run progression

**Decision:** Implement an explicit backend phase machine. A model returns one structured proposal. The application parses and checks exact keys/schema, phase, allowlist, arguments, authoritative context/revision, repeat signature, and budgets. Only the application invokes the selected local function and decides whether the run continues, retries, falls back, completes or stops. A model's final object is a proposal whose evidence and requested strategy are independently checked; the backend recomputes the winner and constructs the public result.

**Rationale:** This directly satisfies the user's instruction that the agent must not decide or self-select what it may do or when it ends. It also preserves the prompt requirement that the model actually proposes a tool rather than the backend secretly precomputing every call.

**Alternatives considered:** Let the model own a general tool loop; rejected because it gives it execution/termination authority. Precompute both evaluations and ask the model only to summarize; rejected because the user prompt requires model tool proposals and would misrepresent application actions as model choices. Add human approval before every local read-only operation; not included in the current scope because the user-authorized tools cannot mutate state and the real purchase remains the player's separate decision. If the user intended an explicit human gate before tool execution, update this feature spec before implementation.

## Decision 2 — Reuse existing authoritative math; make evaluation pure and bounded

**Decision:** Use current source rules: red food grants `10 + 2 × Extra XP level`; next level threshold is `25 × n × (n + 1)` XP; each crossed level grants one point; Extra XP costs 1–5 across levels 0–4; next life costs 5/8 and caps at two charges. Start from a sanitized snapshot copy and simulate at most 100 food events. If useful, extract narrow pure threshold/cost helpers so tests compare projection and engine rules.

**Rationale:** Existing implementation and tests are authoritative. The evaluator should not clone a full game state or invoke purchase/game transition methods, so it cannot affect RNG, timers, revision or canonical state. Lucky points already earned are included in current points; no future Lucky points are projected.

**Alternatives considered:** Estimate from a fixed number of points/food ratio; rejected because XP level thresholds and Extra XP can cross multiple levels. Simulate full Snake movement and collisions; rejected because the prompt explicitly sets a no-collision, red-food-only model. Loop from level 1 to derive every projected level; rejected for large current XP and unnecessary work within 100 events.

## Decision 3 — Keep the provider allowlist and use a single-step internal contract

**Decision:** Reuse only the server-selected Google chain Flash → Flash-Lite → Gemma 4 and existing error classifications. Add an internal model-step request/response interface for one proposal or final result at a time. Enforce the existing per-model retry rules within one stricter W05 total budget of six provider attempts and 30 seconds. Keep W04 shop advice at its current 85-second behavior.

**Rationale:** Provider SDK details remain outside the workflow logic. A whole-run attempt counter prevents a four-step agent multiplied by the existing six attempts per request. A separate endpoint and DTO preserve feature 002 compatibility.

**Alternatives considered:** Add a second provider; prohibited by project contract. Reuse `createShopAdvisor` as-is; rejected because it returns only a shop decision and has no proposal/tool protocol. Increase the W05 total budget to 85 seconds; rejected because the feature prompt sets 30 seconds.

## Decision 4 — Validate semantic evidence and use deterministic backend outcome selection

**Decision:** Give every successful tool result a run-scoped server evidence ID. Final output must refer to existing relevant IDs. Backend independently checks strategy availability, completed projections, counts, tie-break and current revision, then selects recommendation/status and builds all user-visible numeric text from the validated values.

**Rationale:** Exact JSON alone does not prove that a recommendation is meaningful or true. Deterministic selection makes the model advisory and prevents fabricated IDs, claims or winners.

**Alternatives considered:** Display model-written prose/numbers; rejected because it can contradict the evaluator or fabricate evidence. Treat `completed: true` as proof; rejected because only validated application facts establish completion.

## Decision 5 — Share operation exclusion and staleness checks

**Decision:** Use a shared per-game gate across ASK SHOP AI and the new life-plan action. Bind each W05 run to one starting revision and recheck authoritative paused status/revision before every tool execution and final response. Abort on direct request cancellation/deadline; client discards stale response even where the Vite proxy does not propagate abort.

**Rationale:** Separate in-flight sets would permit overlapping provider work for one game. The server tracks paused status but not whether the browser overlay is open, so client visibility gates the button and the server enforces paused status.

**Alternatives considered:** Let both actions execute concurrently; rejected due to multiplied provider budget and races. Add server-persisted shop-open state; rejected as unnecessary architecture/state expansion. Assume browser abort always reaches backend; rejected based on Evidence 013.

## Resolved technical unknowns

- Runtime stack, existing provider behavior, API patterns, authoritative state, formula, costs/caps, test runner and abort limitation were inspected in repository sources listed in Evidence 014.
- No product requirement remains marked `NEEDS CLARIFICATION`; the accepted prompt fixes tool names, limits, strategies, fallbacks, statuses and projection assumptions.
- The standalone course assignment at `Downloads/weekly-assignment.md` exists and matches the previously supplied `(1)` file byte-for-byte.
