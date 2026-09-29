# Tasks: Run XP and Perks — Phase 1

**Prerequisites**: [spec.md](spec.md), [plan.md](plan.md), [data-model.md](data-model.md),
[game-api.md](contracts/game-api.md), and [quickstart.md](quickstart.md)

Check each implementation and documentation task only after its recorded evidence exists. T016 is
manual browser QA and remains pending until actually performed.

## Phase 1 — XP progression and perk shop

- [x] T001 Record the pre-implementation baseline and freeze Q1–Q5 in `docs/tracking/evidence/EVIDENCE_006.md`
- [x] T002 Add XP thresholds, multi-level awards, Extra XP, and reset tests in `tests/gameSession.test.ts` and `tests/snake.test.ts`
- [x] T003 Implement XP, derived levels, point awards, and Extra XP state in `src/game/snakeEngine.ts`
- [x] T004 Add exact cost/cap, invalid purchase, and no-mutation tests in `tests/gameSession.test.ts` and `tests/httpServer.test.ts`
- [x] T005 Implement atomic Extra XP and Extra Life purchase rules in `src/game/snakeEngine.ts` and `server/gameSession.ts`
- [x] T006 Add the exact perk purchase route and failure mapping in `server/httpServer.ts`
- [x] T007 Extend snapshot projection and strict validation for progression, Extra XP, and lives in `src/game/gameProtocol.ts` and `tests/gameProtocol.test.ts`
- [x] T008 Add purchase calls and business-error handling in `src/api/gameClient.ts`
- [x] T009 Add XP/perk/life HUD, accessible paused shop, S/SHOP controls, plus-only purchases, and CLOSE SHOP in `index.html` and `src/main.ts`
- [x] T010 Style numeric cube indicators and responsive shop layout in `src/styles.css`
- [x] T011 Add life collision/respawn/retention tests in `tests/snake.test.ts`
- [x] T012 Implement life collision recovery and safe food placement in `src/game/snakeEngine.ts`
- [x] T013 Verify core Snake and read-only Hint regressions; update `docs/tracking/evidence/EVIDENCE_006.md`
- [x] T014 Run `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`; record actual results in `docs/tracking/evidence/EVIDENCE_006.md`
- [x] T015 Record changed files, checks, limitations, and next step in `docs/tracking/WORK_LOG.md` and `docs/tracking/AI_USAGE_LOG.md`
- [ ] T016 Manually verify shop, purchase, pause/resume, HUD, life recovery, and restart flows in a browser
- [x] T017 Update Q4's closing behavior and record the UI follow-up in the feature spec, quickstart, work log, and Evidence 006
- [x] T018 Clarify Luck and Lucky pickup scope/tuning in Spec Kit artifacts and prompt v3
- [x] T019 Add deterministic spawn-probability, pickup placement, point-only collection, Luck costs/cap, and reset tests
- [x] T020 Implement Luck state, five-level spawn chance, one-active-pickup rule, and Lucky collection in the pure game engine
- [x] T021 Extend paused-only perk purchase validation/route for Luck
- [x] T022 Extend authoritative snapshot projection and strict validation for Luck and Lucky pickup
- [x] T023 Add Luck to perk HUD/shop and render the pickup in orange on its own row below run stats
- [x] T024 Preserve/reset Luck and ensure non-overlapping pickup through collision recovery/restart
- [x] T025 Run project gates, update Evidence 007 and tracking, and verify no base-spec content change
- [ ] T026 Manually verify Luck purchase, orange pickup, reward, and reset in a browser when available
- [x] T027 Fix snapshot validation to accept Lucky bonus points; add a level-1 one-point protocol regression test

## Completion gate

Automated implementation is complete when all applicable automated tasks are checked based on
actual evidence, feature evals are recorded, all project gates pass, and core game/Hint behavior
remains intact. T016 and T026 are separate browser QA checks and must not be reported as passed until
actually performed.
