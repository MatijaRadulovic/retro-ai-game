# Evidence 007 — Luck perk and orange Lucky pickup

## Record and task context

- **Purpose / accepted goal:** add a Luck perk with five levels and an orange Lucky pickup that awards one perk point.
- **Governing spec/task plan:** `specs/001-powerups-perks/spec.md`, `plan.md`, and `tasks.md`.
- **Prompt artifact/version:** [BUILD_PROMPT_POWERUPS_PERKS_V3.md](../../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V3.md).
- **Starting state:** XP/Extra XP/Extra Life implementation present; worktree had earlier user-requested changes. Lucky perk/pickup absent.
- **Sources used:** feature spec, data model, API contract, quickstart, prior Evidence 006, game engine, session manager, snapshot protocol, browser UI, and focused tests; project instructions 01, 02, 04, and 05.
- **Sources excluded:** `docs/specs/BASE_GAME_SPEC.md` contents are out of scope and must remain byte-identical; no AI Hint contract change, external service, or third-party asset.
- **Conflict/assumptions:** latest user request supersedes FR-018's prior Luck/pickup exclusion. Tuning assumption: base spawn chance 5% + 5 percentage points per Luck level, max 30%; costs 1–5 points by purchased level; roll after red food when no Lucky pickup is active; Lucky pickup awards one point only.
- **Spec Kit:** local `specify check` reports ready; no installed Spec Kit automation workflow, so consistency review is manual against the local Spec Kit artifact layout.

## Baseline

Captured before code changes:

- `npm run typecheck`: exit 0, no diagnostics.
- `npm test`: exit 0; 31 passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; TypeScript and Vite production build succeeded.
- New Luck/pickup eval baseline: N/A — capability absent.
- Browser baseline: not captured; no browser is available in this session.

## Frozen scenarios and results

| ID | Scenario / expected result | Baseline | After |
|---|---|---|---|
| L1 | Buy Luck while paused at exact 1–5 costs; reject invalid/unaffordable/wrong-status/capped requests without state/revision changes | N/A — no Luck perk | Passed: pure purchase tests cover 1–5 costs, cap, insufficient points and wrong status; HTTP test covers successful paused Luck purchase; strict request validation covers unknown perk. |
| L2 | Red food trigger rolls 5%, 10%, 15%, 20%, 25%, 30%; at most one orange pickup, spawned off snake and red food | N/A — no Lucky pickup | Passed: deterministic rolls below and at each of six boundaries, active-item suppression, and placement checks. |
| L3 | Eating orange Lucky pickup grants exactly one perk point and clears it; score, XP, and snake length do not change | N/A — no Lucky pickup | Passed: focused engine test confirms exactly one point and no score/XP/growth side effects. |
| L4 | Restart clears Luck/pickup; life recovery retains Luck and relocates conflicting items; strict snapshots and existing regressions pass | N/A — no Luck/pickup fields | Passed: fresh/restarted snapshots reset Luck and pickup; life recovery retention/relocation and protocol overlap rejection tested; all regression tests pass. |

## Controlled change — iteration 1

- **Hypothesis / reason:** adding one small pickup and one capped perk can fit existing state, purchase, snapshot, and HUD/shop boundaries without changing base-game rules or the Hint contract.
- **Bounded change:** implement the Luck level, spawn chance and orange collectible, one-point reward, purchase flow, UI row/card, validation, and focused tests.
- **Files:** feature docs and prompt v3; `src/game/snakeEngine.ts`, `src/game/gameProtocol.ts`, `server/gameSession.ts`, `server/httpServer.ts`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `src/styles.css`, and focused tests.
- **Out of scope preserved:** other collectible items, timed effects, persistence/accounts, new mode, provider work, and edits to the base game spec.

## After verification

Final checks (all exit 0): `npm run typecheck`; `npm test` (33 passed, 0 failed); `npm run build`; `git diff --check`; `specify check` (CLI ready). SHA-256 for `docs/specs/BASE_GAME_SPEC.md` remains `5f0543c6c5afb99fae9ba0f6c6daad8442a9ab12073f1a306f12a432a1a9fe34`, matching the prior recorded hash in Evidence 006.

Browser visual QA was attempted through the in-app browser control, but no browser connections were available (`browsers.list()` returned an empty list); T026 remains pending. The verification establishes engine/API/protocol behavior and production compilation, not visual layout in a live browser.

## Controlled change — iteration 2: Lucky bonus-point snapshot rejection

- **Observed failure:** the engine correctly changed progression to level 1 / 1 perk point after collection, but snapshot validation returned `null` because of the obsolete constraint `perkPoints <= level - 1`. The client drops invalid snapshots, making the pickup appear to freeze/crash the game.
- **Reproduction before fix:** a level-1 snapshot with 1 point produced `{ level: 1, perkPoints: 1, accepted: false }` from `validateGameSnapshot`.
- **Fix:** removed the earned-level upper bound; validation still requires perk points to be a nonnegative safe integer. The ready-state zero-progress invariant remains intact. Updated the feature data model to document that Lucky pickups can add points beyond level-ups.
- **Regression coverage:** protocol test validates a playing level-1 snapshot with 1 perk point; invalid XP/level combinations and malformed snapshots remain rejected.
- **After verification:** `npm run typecheck` exit 0; `npm test` exit 0 (33 passed, 0 failed); `npm run build` exit 0; `git diff --check` exit 0.

## Honest limitations

- The spawn tuning values are explicit implementation assumptions because the request did not specify exact percentages or prices.
- No browser connection was available; UI behavior is compile/test checked but not visually verified.
