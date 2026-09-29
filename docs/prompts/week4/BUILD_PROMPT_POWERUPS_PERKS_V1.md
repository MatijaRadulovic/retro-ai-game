# BUILD PROMPT — RETRO SNAKE powerups and perks

**Version:** v1

## Goal

Add run-based XP progression, collectible powerups, and a perk shop to RETRO SNAKE. Keep the existing server authoritative for all game state.

## Context and source priority

Use these sources in order:

1. The current user request and accepted decisions in this prompt.
2. `AGENTS.md` and relevant modules linked from [`docs/INSTRUCTIONS.md`](../../INSTRUCTIONS.md).
3. The updated [`GAME_SPEC.md`](../../specs/GAME_SPEC.md).
4. Existing implementation and tests.

The user-approved feature rules supersede the current spec's out-of-scope note about lives and powerups. Update the spec with the accepted rules before implementing. Preserve the local, read-only AI Hint behavior and security boundary.

Relevant guidance includes [`01-project-architecture.md`](../../instructions/01-project-architecture.md), [`02-code-conventions.md`](../../instructions/02-code-conventions.md), [`04-testing-and-verification.md`](../../instructions/04-testing-and-verification.md), and [`05-workflow-tracking-and-reporting.md`](../../instructions/05-workflow-tracking-and-reporting.md). Current architecture references include `server/gameSession.ts`, `src/game/gameProtocol.ts`, `src/main.ts`, and `src/styles.css`.

## Scope and constraints

- Add three collectible powerups:
  - **Speed Boost:** move 25% faster for 5 seconds.
  - **Shield:** lasts 5 seconds and cancels one collision. On collision, cancel the attempted move and leave the snake at its last safe position so the player can steer away.
  - **Double Food:** double score and XP for the next 3 food pickups; snake growth remains normal.
- Eating food grants 10 XP by default. Reaching level `n + 1` requires `50 × n` XP. Each level grants one perk point. Perk points and all progression are run-only.
- Add three perks, bought with perk points:
  - **Luck:** maximum level 5; each level adds 5 percentage points to a base 5% chance that eating food spawns a powerup. Cost by purchased level: 1, 2, 3, 4, then 5 points.
  - **Extra XP:** maximum level 5; each level adds 2 XP per food. Cost by purchased level: 1, 2, 3, 4, then 5 points.
  - **+1 Life:** each purchase grants one extra-life charge; hold no more than 2 charges at a time. Suggested costs are 5 points for the first charge and 8 for the second. A charge prevents one game-ending collision and safely respawns the snake while retaining the run's score, XP, and perk purchases.
- Pressing **S** while playing pauses the game and opens the perk shop overlay. While paused, S may show or hide the shop without resuming play. Include a clear Resume action. The shop displays each perk's current level/charges, next cost, and a **+** purchase button. There is no **−** button or refund. A purchase takes effect immediately; invalid or unaffordable purchases are rejected safely.
- While playing, display perk levels as filled and empty cubes (for example, `Luck 3/5` and `Extra XP 2/5`). Display extra-life charges as cubes such as `Lives 1/2`.
- Suggested spawn rule: at most one powerup on the board at a time; choose its type randomly with equal odds. Place it only on an unoccupied cell. Luck changes the spawn chance as described above.
- Restarting or starting a new run resets XP, level, unspent perk points, perk purchases, powerup effects, and extra-life charges. A life-saving collision recovery continues the current run.
- Keep powerups and perks as separate systems: powerups are collected on the board; perks use points earned from level-ups.
- The server remains authoritative for XP, levels, pickups, perk points, purchases, lives, timers, pause state, and snapshots. Validate actions and snapshot data at runtime. The client renders validated snapshots and submits intended actions; it does not mutate authoritative game state.
- Use the existing TypeScript/Vite client and TypeScript Node server. Do not add a database, accounts, online currency, live AI/provider, new game modes, third-party assets, or broad refactors.

## Allowed files

Edit only relevant existing files under `server/`, `src/game/`, `src/api/`, and `tests/`, plus `src/main.ts`, `src/styles.css`, `docs/specs/GAME_SPEC.md`, and the task's entries in `docs/tracking/WORK_LOG.md`, `docs/tracking/AI_USAGE_LOG.md`, and a new task evidence file under `docs/tracking/evidence/`. Use existing prompt and evidence templates as read-only references. Do not edit unrelated files.

## Acceptance criteria

- XP awards, level thresholds, perk point awards, costs, caps, and resets follow the rules above.
- Powerups spawn only on free cells; Luck adjusts their spawn chance. Their duration/uses behave correctly through pause, resume, collision, and restart.
- The S-key flow pauses and opens the shop. The shop shows costs and purchase buttons, applies valid purchases immediately, and provides a clear way to resume.
- Invalid, unaffordable, and over-cap purchases fail safely without mutating state.
- Shield and extra lives handle collisions as specified. Extra-life charges are consumed on use and never exceed two.
- The HUD and shop show perk levels and remaining extra-life charges as cubes.
- Existing controls, Snake rules, and read-only Hint behavior continue to work.
- Add focused automated tests for progression boundaries, costs and caps, invalid purchases, each powerup, collision recovery, reset behavior, and snapshot validation.
- Update the game spec and required task tracking records.

## Verification instructions

Run and record actual results for `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`. Manually verify the S-key shop flow, purchases and their immediate effects, HUD cubes, powerup collection, pause/resume, collision recovery, and run reset. Distinguish automated checks from manual checks and report failures or skipped checks honestly.
