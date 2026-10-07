# Tasks: AI Plan to Next Life

**Input**: Design documents from `specs/003-ai-plan-to-next-life/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`

**Tests**: Required by FR-021 and the user-approved feature spec. Use fake providers and deterministic time; no live provider calls.

## Phase 1: Setup

**Purpose**: Confirm the existing game and AI contracts before implementation.

- [x] T001 Capture a fresh implementation baseline and preserve W05-01–W05-25 in `docs/tracking/evidence/EVIDENCE_014.md`

## Phase 2: Foundational

**Purpose**: Build the deterministic evaluator, runtime contracts, and shared AI coordination required by the life-plan flow.

- [x] T002 [P] Add pure life-plan context/evaluation types and exact runtime validators in `src/ai/lifePlan.ts`
- [x] T003 [P] Add evaluator tests for actual XP thresholds, multi-level awards, 5/8 life prices, Extra XP, caps, and 100-food boundary in `tests/lifePlan.test.ts`
- [x] T004 Add a shared per-game AI request gate without changing advisor policy in `server/ai/aiRequestGate.ts`
- [x] T005 Extract or expose only pure authoritative XP/perk pricing helpers needed by projection in `src/game/snakeEngine.ts`
- [x] T006 Implement bounded, deterministic save and hypothetical Extra XP projection with evidence IDs in `server/ai/lifePlanTools.ts`
- [x] T007 Validate tool inputs/results, semantic math, serialized size and local execution budget in `server/ai/lifePlanTools.ts`

**Checkpoint**: Pure projection and all tool trust-boundary tests pass without touching canonical game state.

## Phase 3: User Story 1 — Compare ways to reach the next life (Priority: P1)

**Goal**: Let the player request a bounded comparison while paused; the application selects the recommendation and never buys anything.

**Independent Test**: Deterministic fake run covers both strategies and unavailable Strategy B; displayed result matches backend recalculation and game state remains unchanged.

### Tests for User Story 1

- [x] T008 [P] [US1] Add fake-provider tests for four-step/two-strategy and three-step/unavailable-Extra-XP runs in `tests/lifePlan.test.ts`
- [x] T009 [P] [US1] Add HTTP empty-body/read-only route and application preflight tests for already affordable and life cap in `tests/httpServer.test.ts` and `tests/lifePlan.test.ts`

### Implementation for User Story 1

- [x] T010 Implement the application-owned run state, phase allowlist, proposal validation, evidence binding, deterministic winner/tie policy and cleanup in `server/ai/lifePlan.ts`
- [x] T011 Add exact run-scoped context/evaluation/final prompt and normalized Google step adapter in `server/ai/lifePlan.ts` and `server/ai/geminiTransport.ts`
- [x] T012 Add the fixed paused-shop life-plan endpoint, preflight outcomes, shared AI gate and revision/cancellation checks in `server/httpServer.ts`
- [x] T013 Add the exact public life-plan response schema and semantic validation in `src/ai/lifePlan.ts`
- [x] T014 Add browser request and response validation for `POST /api/games/:gameId/life-plan` in `src/api/gameClient.ts`
- [x] T015 Add a separate `PLAN DO +1 LIFE` button and safe status/comparison rendering in `index.html` and `src/main.ts`
- [x] T016 Add life-plan pending/result presentation styles in `src/styles.css`
- [x] T017 Add state-invariance and successful manual-purchase-separation tests in `tests/lifePlan.test.ts`

**Checkpoint**: Story 1 returns only application-verified bounded outcomes, and the player remains responsible for any purchase.

## Phase 4: User Story 2 — Keep the agent under application control (Priority: P1)

**Goal**: Reject malformed, unauthorized, repeated, out-of-phase, over-budget and semantically contradictory proposals/results before they gain authority.

**Independent Test**: Invalid proposals execute zero tools; invalid results never reach the next step; contradictory finals cannot override deterministic selection.

### Tests for User Story 2

- [x] T018 [P] [US2] Add malformed/unknown/out-of-phase/repeated/over-budget proposal rejection tests in `tests/lifePlan.test.ts`
- [x] T019 [P] [US2] Add oversized, malformed, stale and semantically invalid tool-result plus contradictory-final tests in `tests/lifePlan.test.ts`

### Implementation for User Story 2

- [x] T020 Enforce strict one-proposal model-step decoding and proposal schema in `server/ai/lifePlan.ts`
- [x] T021 Enforce phase, exact arguments, revision, signature, count and deadline checks before every tool execution in `server/ai/lifePlan.ts`
- [x] T022 Enforce exact result shape, size, strategy/evidence relationship and recalculated projection before forwarding results in `server/ai/lifePlan.ts`
- [x] T023 Generate only trusted public wording and deterministic result selection from accepted evidence in `server/ai/lifePlan.ts`

**Checkpoint**: Rejected model/tool content cannot invoke unauthorized operations or appear as trusted evidence.

## Phase 5: User Story 3 — Recover safely from interruption and provider errors (Priority: P2)

**Goal**: Bound the complete multi-step run, clear all in-flight state, suppress stale output, and preserve the existing shop advisor.

**Independent Test**: Fake transport and deterministic clock cover retries/fallback, terminal errors, timeout/deadline, cancellation/stale revision, cleanup, and advisor regression.

### Tests for User Story 3

- [x] T024 [P] [US3] Add run-wide provider attempt, per-attempt timeout, deadline, terminal/transient, cancellation and cleanup tests in `tests/lifePlan.test.ts`
- [x] T025 [P] [US3] Add shared-gate concurrency and existing ASK SHOP AI compatibility regression tests in `tests/shopAdvice.test.ts` and `tests/httpServer.test.ts`
- [x] T026 [P] [US3] Extend fake-server browser E2E for the new button, bounded result, stale-result suppression and state invariance in `scripts/e2e/fakeAdvisorServer.ts` and `scripts/e2e/shopAdvisor.e2e.ts`

### Implementation for User Story 3

- [x] T027 Reuse the approved Google chain with W05 run-wide attempt/deadline limits and normalized model steps in `server/ai/geminiTransport.ts`
- [x] T028 Apply one per-game gate to both life-plan and shop-advice HTTP handlers while preserving the advisor module contract in `server/ai/aiRequestGate.ts` and `server/httpServer.ts`
- [x] T029 Stop on cancellation, stale revision, deadline and terminal errors; clear run state and gate on every exit in `server/ai/lifePlan.ts`
- [x] T030 Suppress late/cancelled responses and disable both actions during shared in-flight work in `src/main.ts` and `src/api/gameClient.ts`

**Checkpoint**: Each exit clears state; old results never render as current; existing ASK SHOP AI behavior remains intact.

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verify implementation against the feature contract and record actual evidence.

- [x] T031 Run the complete frozen W05-01–W05-25 automated evaluation matrix and record outcomes/limitations in `docs/tracking/evidence/EVIDENCE_014.md`
- [x] T032 Run `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan`, `npm run test:e2e`, Markdown link validation and `git diff --check`; record exact outcomes and skips in `docs/tracking/evidence/EVIDENCE_014.md`
- [x] T033 Update W05 completion checklist, AI usage log and implementation handoff with evidence-backed status in `docs/tracking/checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_CHECKLIST.md`, `docs/tracking/AI_USAGE_LOG.md` and `docs/tracking/WORK_LOG.md`
- [ ] T034 Conduct and record the human pair demo/review of the successful and rejected runs, application authority, budgets, stop reasons and known limitations in `docs/tracking/evidence/EVIDENCE_014.md`
- [x] T035 Apply the later 60-second life-plan deadline and approved-model fallback recovery in `server/ai/lifePlan.ts`; cover timeout normalization, fallback reuse, Gemma completion, global budget and safe messages in `tests/lifePlan.test.ts`; record tool timing and verification in `docs/tracking/evidence/EVIDENCE_016.md`
- [x] T036 Shorten player-facing life-plan copy in `server/ai/lifePlan.ts` and `src/main.ts`; keep response-contract assumptions internal and verify recommendation, comparison, incomplete/pending states, read-only behavior and stale suppression in `tests/lifePlan.test.ts` and `scripts/e2e/shopAdvisor.e2e.ts`. Record results in `docs/tracking/evidence/EVIDENCE_017.md`.

## Dependencies & Execution Order

### Phase Dependencies

- Setup establishes the fresh baseline before code changes.
- Foundational tasks block all stories because stories depend on shared tool contracts, canonical formulas, and a game-scoped gate.
- User stories proceed in priority order. US2 validates the policy introduced by US1; US3 adds interruption/recovery guarantees and advisor compatibility.
- Polish depends on all stories.

### User Story Dependencies

- US1 (P1): depends on Foundational; delivers the usable fixed-goal comparison.
- US2 (P1): depends on US1's run phases and tool contracts; hardens every model/tool trust boundary.
- US3 (P2): depends on the run and HTTP boundary from US1/US2; adds cross-step recovery and advisor regression safety.

### Parallel Opportunities

- T002 and T003 can be authored independently; T008/T009 and T018/T019 are independent test files/scenarios subject to shared test-file ownership.
- Once foundational contracts stabilize, client rendering (T015–T016) can proceed independently from evaluator tests, but endpoint DTO must be agreed first.
- E2E extension (T026) can be developed independently after the endpoint/UI contract is implemented.

## Implementation Strategy

1. Complete the fresh baseline and foundational pure evaluator/contracts.
2. Implement and validate US1 as the MVP using fake model steps.
3. Complete US2 strict authority checks before broad UI verification.
4. Complete US3 budgets, cancellation, stale-state handling and existing-advisor regression.
5. Run all frozen evals and required project gates; update evidence and handoff.

## Notes

- Every task includes its implementation/test file path and a sequential task ID.
- Tests are required by FR-021; fake providers only, no credentials or live calls.
- Preserve current advisor 85-second policy while applying the W05 60-second deadline and six-attempt run budget to the new feature. The later user request supersedes the original 30-second W05 prompt limit.
- Do not push or deploy as part of implementation.
