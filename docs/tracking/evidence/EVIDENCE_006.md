# Evidence 006 — XP and perks Phase 1

## Record and context

- **Goal:** narrow the powerups/perks proposal to XP, Extra XP, and +1 Life; rename the untouched core
  game document to Base Game Specification; produce and implement the small Phase 1 package.
- **Prompt:** [BUILD_PROMPT_POWERUPS_PERKS_V1.md](../../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md).
- **Spec and plan:** [feature specification](../../../specs/001-powerups-perks/spec.md) and
  [plan](../../../specs/001-powerups-perks/plan.md).
- **Starting state:** `main` at `091fe25`, two commits ahead of `origin/main`; clean except for an
  untracked `.specify/feature.json` pointer. The IDE-listed feature artifacts and original prompt
  were absent from this checkout.
- **Sources used:** `AGENTS.md`, `docs/INSTRUCTIONS.md`, relevant architecture/workflow/test guidance,
  the current base game spec, HTTP/session/protocol source, existing tests, and prompt/evidence
  templates. The earlier prompt content was present in the conversation.
- **Conflict handling:** the user's current instruction narrows the original feature. The base game
  spec was renamed and its contents were preserved. Feature additions live only in the new feature
  spec.
- **Initial planning-only pass:** game implementation and tests were out of scope; the later
  implementation turn is recorded separately below.

## Frozen scenarios

| ID | Scenario | Expected | Baseline | After planning |
|---|---|---|---|---|
| Q1 | XP awards at thresholds, Extra XP, multi-level awards, restart | Correct cumulative XP, level, points, and reset | Capability absent | Not implemented |
| Q2 | Extra XP and life purchases, costs, caps, invalid requests | Exact atomic purchase or unchanged rejection | Capability absent | Not implemented |
| Q3 | Wall/self collision with 0, 1, or 2 lives | Correct game over or safe respawn; retain run progress | Capability absent | Not implemented |
| Q4 | S/SHOP pause and Resume behavior | Shop visibility toggles while paused; Resume continues | Capability absent | Not implemented |
| Q5 | Snapshot and regression checks | Invalid feature data rejected; core Snake and Hint stay intact | Feature shape absent | Not implemented |
| D1 | Documentation and link integrity | Base spec unchanged; all artifact links resolve | Feature artifacts absent | Pass |

## Controlled change

- **Change:** renamed `docs/specs/GAME_SPEC.md` to `docs/specs/BASE_GAME_SPEC.md` without content
  edits; redirected references and created a narrowed XP/perks prompt and feature package.
- **Files:** Base spec path/reference docs, `docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md`,
  `specs/001-powerups-perks/`, Evidence 006, and tracking logs.
- **Excluded from change:** server/client/game/test implementation and base spec content.

## Verification

- Base spec content checksum matches the original tracked file exactly:
  `5f0543c6c5afb99fae9ba0f6c6daad8442a9ab12073f1a306f12a432a1a9fe34` for both files.
- `git diff --check`: exited 0 with no output.
- Task format check: `tasks=15 bad=0`; feature specification contains 18 FRs.
- Relative Markdown-link scan: `All relative Markdown links resolve across 16 files.`
- Placeholder scan found only intended scope exclusions; trailing-whitespace scan returned no matches.
- Code checks are skipped because this is planning/documentation-only; no implementation was changed.
- Manual gameplay checks are skipped because the feature is not implemented.

## Iteration 1 (planning-only snapshot) limitations

- At the end of the initial planning-only pass, XP/perks/lives remained unimplemented and Q1–Q5 were
  not passes; current implementation outcomes are recorded below.
- The feature prompt was recreated from the original user-provided prompt because its file was absent
  in the current checkout.
- Reviewer checklist items are intentionally unchecked.

## Controlled change — iteration 2: Phase 1 implementation

- **Hypothesis / reason:** the approved feature spec can be implemented additively while preserving
  existing Snake behavior, server authority, and the Hint's sanitized read-only input.
- **Change:** added run XP/levels/points, Extra XP and Extra Life purchases in a paused shop, charged
  wall/self collision recovery, exact runtime snapshot validation, HUD/shop rendering, and focused
  deterministic tests. No collectible powerups or changes to the Base Game Specification contents.
- **Files:** `src/game/snakeEngine.ts`, `src/game/gameProtocol.ts`, `server/gameSession.ts`,
  `server/httpServer.ts`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `src/styles.css`,
  and tests for Snake, sessions, HTTP, and snapshots; updated the feature tasks and tracking records.
- **Out of scope preserved:** persistence/accounts, new modes, collectible powerups, Luck, speed/shield/
  double-food effects, live AI/provider work, and core-rule changes.

## Implementation baseline

Captured before code edits on the same working tree (documentation package already present):

- `npm run typecheck`: exit 0, no diagnostics.
- `npm test`: exit 0; 26 tests passed, 0 failed; includes typecheck.
- `npm run build`: exit 0; TypeScript build and Vite production build succeeded.
- Frozen Q1–Q5 baseline remains **N/A — capability absent**; the previous core/Hint suite is the
  regression baseline, not a pre-existing progression implementation.
- Manual browser baseline: not captured; no browser was connected in this session.

## Frozen Q1–Q5 after implementation

| ID | Result | Evidence / limits |
|---|---|---|
| Q1 | Pass | Deterministic food XP, 50/150/300 thresholds, multi-level awards, Extra XP award, and restart reset tests. |
| Q2 | Pass | Pure purchase tests cover exact Extra XP and life costs/caps and atomic rejection; HTTP tests cover valid Extra XP purchase, malformed request, wrong status, and unchanged revision. |
| Q3 | Pass | Wall and self collision tests verify charge consumption, safe three-segment respawn, continued play, and retained run progress. |
| Q4 | Superseded by Q4-v2 | Original shop visibility behavior is historical; the user changed close-to-resume behavior in iteration 3 below. |
| Q5 | Pass | Strict snapshot validation tests plus the complete existing core Snake and read-only Hint regression suite. |

## Controlled change — iteration 3: shop overlay and close-to-resume behavior

- **Requirement update:** the user requested the shop appear over the game and closing it unpause.
  This supersedes the earlier Q4 behavior; Q1–Q3 and Q5 remain unchanged.
- **Clarification prompt:** current user request and [build prompt v2](../../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V2.md).
- **Frozen Q4-v2 scenario:**
  1. While playing, S/SHOP pauses and shows the shop over the board.
  2. If paused separately with P/Space, S/SHOP opens the overlay and the run remains paused.
  3. With the shop open, S, SHOP, or CLOSE SHOP closes the overlay and resumes play.
- **Baseline:** the prior UI placed shop content below the game card; S/SHOP only toggled visibility
  while paused. This baseline is from source inspection, not a browser observation.
- **Change:** moved the shop into the board overlay stack; changed closing the open shop to resume;
  kept pause-then-open when activating SHOP during play and open-without-resume when paused separately.
- **Files:** `index.html`, `src/main.ts`, `src/styles.css`, build prompt v2, feature `spec.md`,
  `plan.md`, `quickstart.md`, `tasks.md`, this evidence, and work/AI-usage logs.
- **After result:** Q4-v2 source behavior is implemented; its visual/manual result remains **not
  browser-verified** because this session has no connected browser. No visual pass is claimed.
- **Automated checks after this iteration:** `npm run typecheck` exit 0; `npm test` exit 0 (31 passed,
  0 failed); `npm run build` exit 0 (TypeScript and Vite production build succeeded);
  `git diff --check` exit 0 with no output.
- **Documentation check:** all relative Markdown links resolve across 36 files.
- **Scope preserved:** XP/perk rules, server authority, run state, and Base Game Specification contents.

## Implementation verification

- `npm run typecheck`: exit 0, no diagnostics.
- `npm test`: exit 0; 31 tests passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; TypeScript build and Vite production build succeeded.
- `git diff --check`: exit 0, no output.
- Relative Markdown-link scan: all links resolved across 35 Markdown files.
- `specify check`: exit 0; Spec Kit CLI reports the environment ready. No Spec Kit automation
  workflow is installed, so the artifact review used its available Spec Kit templates/structure and
  local project constraints; it is not represented as an automated `/speckit.analyze` run.
- Browser attempt: Browser runtime returned no available browser (`agent.browsers.list()` was empty);
  visual/manual scenarios remain pending under T016.

## Implementation limitations

- Automated behavior and production compilation are verified; visual shop layout and keyboard/touch
  interactions have not been manually exercised in a browser.
- Life-price progression and UI controls are deterministic/unit/API tested; no browser gameplay run
  was possible here.
