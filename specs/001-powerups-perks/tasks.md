---

description: "Dependency-ordered implementation tasks for run powerups and perks"
---

# Tasks: Run Powerups and Perks

**Input**: Design documents from `specs/001-powerups-perks/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/game-api.md](contracts/game-api.md), and
[quickstart.md](quickstart.md)

**Tests**: Required by the feature specification. Write each focused test task first, run it, and
record the expected feature-specific failure before its paired implementation task.

**Organization**: Tasks are grouped by user story so each story has an explicit independent test and
checkpoint. The final collision story intentionally integrates the Shield from US3 and lives from US2.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it changes different files and has no dependency on an
  incomplete task.
- **[Story]**: Maps the task to the numbered user story in `spec.md`.
- Every task names the exact repository file or narrow file set it changes.

## Phase 1: Setup and Product Contract

**Purpose**: Remove the current long-term spec conflict and freeze evidence before behavior changes.

- [ ] T001 Update levels, progression, perk, powerup, shop, collision-recovery, reset, API, and out-of-scope rules in `docs/specs/GAME_SPEC.md` from `specs/001-powerups-perks/spec.md`, removing only the superseded exclusions and preserving the read-only Hint boundary
- [ ] T002 Capture the pre-implementation working-tree state, exact baseline commands/results, Q1–Q5 frozen scenarios, and current limitations in `docs/tracking/evidence/EVIDENCE_006.md`

**Checkpoint**: The owning product spec and frozen evidence agree with the Spec Kit feature before
source code changes.

---

## Phase 2: Foundational Authoritative State and Contract

**Purpose**: Establish shared state, active-time, and snapshot foundations that block all stories.

**⚠️ CRITICAL**: No user-story implementation begins until this phase is complete.

- [ ] T003 Write failing foundational tests for initial feature state, cumulative level derivation, cap constants, and effect canonicalization in `tests/runFeatures.test.ts`
- [ ] T004 Add feature types/constants and initial/derived helpers in `src/game/runFeatures.ts`, preserving verbatim constraints: `xp` is a safe integer `>= 0`; `perkPoints` is `0 <= value <= derivedLevel - 1`; Luck/Extra XP are `0..5`; lives are `0..2`; Double Food uses are `0..3`; accumulated active play is a nonnegative safe integer
- [ ] T005 Write failing initial-state and restart-shape tests for the expanded run aggregate in `tests/snake.test.ts`
- [ ] T006 Extend `GameState` initialization and pure reset helpers with progression, perks, `powerup: BoardPowerup | null`, effects, and `activePlayMs` in `src/game/snakeEngine.ts`
- [ ] T007 Write failing valid/missing/extra/range/level/cost/occupancy snapshot cases for the expanded exact contract in `tests/gameProtocol.test.ts`
- [ ] T008 Extend snapshot types and strict runtime parsing in `src/game/gameProtocol.ts`, including `level === deriveLevel(xp)`, exact `nextCost`, unique snake cells, non-overlapping food/powerup, timed values `0..5000`, and ready-state invariants
- [ ] T009 Write failing authoritative projection, monotonic-clock injection, and stable same-revision effect-value tests in `tests/gameSession.test.ts`
- [ ] T010 Add `nowMs()` injection, accumulated-active-time settlement, and expanded snapshot projection to `server/gameSession.ts` without changing pause time or publishing rejected/no-op actions

**Checkpoint**: A ready run and its strict snapshot contain the complete initial feature model; no
story behavior is yet required.

---

## Phase 3: User Story 1 — Earn XP and levels during a run (Priority: P1) 🎯 MVP

**Goal**: Food awards exact run XP, derives all crossed levels, grants points, and resets cleanly.

**Independent Test**: Deterministic food fixtures at 40→50 and 140→150 plus a multi-threshold award
produce exact XP/level/point totals; restart resets all feature state while retaining IDs.

### Tests for User Story 1

- [ ] T011 [US1] Add failing XP award, Extra XP level 0–5, threshold boundary, multi-level, and point-award cases in `tests/runFeatures.test.ts`
- [ ] T012 [US1] Add failing normal/Double Food score-XP-growth ordering cases in `tests/snake.test.ts`
- [ ] T013 [US1] Add failing authoritative food-award and restart identity/reset cases in `tests/gameSession.test.ts`

### Implementation for User Story 1

- [ ] T014 [US1] Implement base XP, complete-award doubling, cumulative threshold, derived-level, and crossed-level point helpers in `src/game/runFeatures.ts`
- [ ] T015 [US1] Integrate atomic food score/growth/XP/level/point transitions and run reset into `src/game/snakeEngine.ts`
- [ ] T016 [US1] Project XP, derived level, and perk points through authoritative create/advance/restart snapshots in `server/gameSession.ts`

**Checkpoint**: Q1 passes independently and delivers visible run progression without requiring the
shop, random board powerups, or collision recovery.

---

## Phase 4: User Story 2 — Buy perks from a paused shop (Priority: P2)

**Goal**: A paused player can inspect, buy, reject, hide, and resume through authoritative actions.

**Independent Test**: Paused fixtures buy every level/charge at exact costs; wrong-status,
unaffordable, capped, and malformed requests leave state/revision unchanged; the browser shows the
validated result and accessible controls.

### Tests for User Story 2

- [ ] T017 [US2] Add failing pure purchase cost, cap, held-life repricing, insufficient-points, and identical-state failure cases in `tests/runFeatures.test.ts`
- [ ] T018 [P] [US2] Add failing manager purchase status, revision, publication, reset, and container-isolation cases in `tests/gameSession.test.ts`
- [ ] T019 [P] [US2] Add failing `POST /api/games/:gameId/perks` exact-body, success, and 400/404/409 no-mutation cases in `tests/httpServer.test.ts`

### Implementation for User Story 2

- [ ] T020 [US2] Implement atomic `luck`, `extra_xp`, and `extra_life` purchase results with costs `1,2,3,4,5`, life costs `5/8`, and caps `5/5/2` in `src/game/runFeatures.ts`
- [ ] T021 [US2] Add paused-only purchase orchestration, typed session errors, one success publication/revision, and unchanged failure state to `server/gameSession.ts`
- [ ] T022 [US2] Add exact purchase request parsing and the documented error/status mapping to `server/httpServer.ts`
- [ ] T023 [US2] Add typed `purchasePerk(gameId, perk)` and non-connectivity business-error handling support to `src/api/gameClient.ts`
- [ ] T024 [US2] Add semantic progression HUD, visible SHOP control, three plus-only perk rows, shop status live region, and Resume control to `index.html`
- [ ] T025 [US2] Implement snapshot-only HUD/cube rendering, S/SHOP show-hide behavior, paused purchase submission, shop-local errors, interactive-target shortcut guards, and close-on-resume/restart/non-paused behavior in `src/main.ts`
- [ ] T026 [US2] Style filled/empty cubes, perk rows, focus states, internal shop scrolling, and 320/480 px responsive layouts in `src/styles.css`

**Checkpoint**: Q2 passes. The story can be tested with fixture points even before natural powerup
spawns or collision recovery are added.

---

## Phase 5: User Story 3 — Collect temporary board powerups (Priority: P3)

**Goal**: Food can spawn one valid random collectible and each type has exact active-play behavior.

**Independent Test**: Scripted chance/type/cell draws plus a fake clock prove all Luck boundaries,
each pickup, refresh, coexistence, pause freeze, expiration/use count, food priority, and restart.

### Tests for User Story 3

- [ ] T027 [US3] Add failing Luck chance boundary, equal type partition, uniform eligible-cell, at-most-one, no-cell, effect activation/refresh, and effective-pace cases in `tests/runFeatures.test.ts`
- [ ] T028 [US3] Add failing pickup-without-growth, Double Food three-use ordering, concurrent effects, replacement-food priority, and full-board win cases in `tests/snake.test.ts`
- [ ] T029 [US3] Add failing fake-clock pause/resume, timed expiry-before-step, boosted scheduling, restart cleanup, and independent-session timing cases in `tests/gameSession.test.ts`

### Implementation for User Story 3

- [ ] T030 [US3] Implement spawn chance/type/free-cell helpers, effect refresh/reset, expiration, and `max(60, normalTickMs × 0.75)` in `src/game/runFeatures.ts`
- [ ] T031 [US3] Integrate powerup pickup, Double Food award/use, food-first placement, spawn draw order, effect expiry, concurrent effects, and win handling in `src/game/snakeEngine.ts`
- [ ] T032 [US3] Integrate settled active time and Speed Boost scheduling across advance/pause/resume/restart/close in `server/gameSession.ts`
- [ ] T033 [US3] Render validated board powerups with distinct text/shape classes and announce meaningful spawn/effect changes without per-snapshot noise in `src/main.ts` and `src/styles.css`

**Checkpoint**: Q3 passes with deterministic evidence; manual evidence claims only powerups actually
observed in the browser.

---

## Phase 6: User Story 4 — Survive collisions with shield or lives (Priority: P4)

**Goal**: Shield and life defenses resolve every wall/self collision safely and in the right order.

**Independent Test**: The wall/self × none/Shield/life/both matrix yields exactly one outcome per case,
and a life respawn safely retains or clears every specified field.

### Tests for User Story 4

- [ ] T034 [US4] Add failing wall/self collision matrix, expired-Shield, safe-turn-after-cancel, life respawn retention/cleanup, and item-conflict cases in `tests/snake.test.ts`
- [ ] T035 [US4] Add failing life-consumption publication, current-charge repricing, automatic continuation, timer rescheduling, and restart cases in `tests/gameSession.test.ts`

### Implementation for User Story 4

- [ ] T036 [US4] Implement expiry-first Shield cancellation, queued-direction recovery, life decrement, safe three-segment respawn, permanent-state retention, effect cleanup, conflict resolution, and ordinary game over in `src/game/snakeEngine.ts`
- [ ] T037 [US4] Preserve automatic authoritative scheduling and one revision/publication across Shield cancellation and life recovery in `server/gameSession.ts`

**Checkpoint**: Q4 passes and existing no-defense collision behavior remains the fallback.

---

## Phase 7: Polish and Cross-Cutting Verification

**Purpose**: Close strict boundary, regression, documentation, and honest-evidence requirements.

- [ ] T038 [P] Add exact WebSocket-envelope, malformed-event, old/equal-revision, last-valid-state, and business-error-not-offline coverage in `tests/gameProtocol.test.ts`, `tests/httpServer.test.ts`, and `src/api/gameClient.ts`
- [ ] T039 [P] Re-run and, only if needed, extend read-only Hint regression assertions so its exact sanitized keys and no-mutation behavior remain unchanged in `tests/hint.test.ts`
- [ ] T040 Review keyboard/touch focus, numeric/cube equivalence, non-color powerup cues, reduced motion, 320 px, 480 px, desktop, and short-viewport requirements against `index.html`, `src/main.ts`, and `src/styles.css`
- [ ] T041 Run Q1–Q5 plus `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`, recording exact outputs, test count, manual statuses, and limitations in `docs/tracking/evidence/EVIDENCE_006.md`
- [ ] T042 Update completed decisions, changed files, actual checks, limitations, and next step in `docs/tracking/WORK_LOG.md` and `docs/tracking/AI_USAGE_LOG.md` without duplicating Evidence 006
- [ ] T043 Review the final diff for unrelated changes, secrets, live-provider/write-tool expansion, unapproved dependencies, unresolved placeholders, and broken local Markdown links across `specs/001-powerups-perks/` and `docs/`

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1** starts immediately and must finish before source changes.
- **Phase 2** depends on Phase 1 and blocks all user stories.
- **US1 (Phase 3)** depends only on Phase 2 and is the MVP.
- **US2 (Phase 4)** depends on Phase 2; live earning uses US1, but purchase behavior remains testable
  from paused fixtures.
- **US3 (Phase 5)** depends on Phase 2; Double Food integration uses the US1 award pipeline.
- **US4 (Phase 6)** depends on US2 lives and US3 Shield, so it follows both.
- **Phase 7** follows every story selected for the release.

### User-story dependency graph

```text
Foundation ──> US1 ───────┐
     ├──────> US2 ────────┼──> US4 ──> Polish
     └──────> US3 ────────┘
```

US1, US2, and the non-Double-Food portion of US3 can be developed independently after Foundation.
Integrate in priority order to avoid conflicts in shared game files.

### Within each user story

1. Write focused tests and observe the expected failure.
2. Implement pure domain behavior.
3. Integrate server/session/API behavior.
4. Integrate validated browser rendering/actions when applicable.
5. Run the story's independent check before beginning the next priority.

### Parallel opportunities

- T018 and T019 can run in parallel after T017 because they edit different test files.
- Research/spec/evidence review can run separately from source work, but T001–T002 remain gates.
- After Phase 2, US1 domain work and US2 HTTP contract-test preparation can proceed in parallel if
  contributors coordinate shared `runFeatures.ts` changes.
- T038 and T039 can run in parallel after all story behavior is complete.

## Parallel Examples

### User Story 2

```text
Task T018: manager purchase/revision tests in tests/gameSession.test.ts
Task T019: HTTP purchase/error tests in tests/httpServer.test.ts
```

### Cross-cutting verification

```text
Task T038: protocol/WebSocket/client boundary regression
Task T039: unchanged read-only Hint regression
```

## Implementation Strategy

### MVP first

1. Complete Setup and Foundation.
2. Complete US1 progression and reset.
3. Stop and run Q1 plus all existing regressions.
4. Demonstrate visible XP/level/points before adding spending or random effects.

### Incremental delivery

1. Add US2 shop/perk spending and validate Q2.
2. Add US3 random collectibles/effects and validate Q3.
3. Add US4 collision defenses and validate Q4.
4. Finish strict contract, Hint, responsive, and full Q1–Q5 checks.

## Notes

- `[P]` means separate files and no dependency on incomplete tasks; shared `runFeatures.ts`,
  `snakeEngine.ts`, `gameSession.ts`, and `main.ts` tasks should stay sequential.
- Tests are mandatory for this feature and must not be weakened to pass.
- Task checkboxes record implementation completion only after actual evidence exists.
- The custom checklist remains reviewer-owned; implementation must not mark it complete.
