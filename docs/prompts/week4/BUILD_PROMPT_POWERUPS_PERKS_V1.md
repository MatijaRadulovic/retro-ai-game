# BUILD PROMPT — RETRO SNAKE XP and perks

**Version:** v1

## Goal

Implement the Phase 1 run progression feature defined in
[`specs/001-powerups-perks/spec.md`](../../../specs/001-powerups-perks/spec.md): food-based XP,
level-up perk points, and a paused shop with Extra XP and +1 Life perks.

## Context and source priority

Use these sources in order:

1. Current user request and accepted decisions in this prompt.
2. `AGENTS.md` and relevant modules linked from [`docs/INSTRUCTIONS.md`](../../INSTRUCTIONS.md).
3. [`docs/specs/BASE_GAME_SPEC.md`](../../specs/BASE_GAME_SPEC.md) for unchanged core rules.
4. The feature specification and plan under `specs/001-powerups-perks/` for the approved additions.
5. Existing implementation and tests as evidence of current behavior.

The feature spec supplements the base game spec. Preserve the server-authoritative state boundary
and the local read-only `get_game_state` Hint contract.

## Scope and constraints

- Eating food grants 10 XP plus 2 XP per Extra XP perk level.
- Reaching level `n + 1` requires `50 × n` XP since level `n`; each level grants one perk point.
- Extra XP has five levels and costs 1, 2, 3, 4, then 5 points for each next level.
- +1 Life costs 5 points when holding zero charges and 8 when holding one; at most two charges.
- Pressing S during play pauses and opens the shop. While paused, S shows/hides the shop without
  resuming. Include a visible SHOP control for touch use and a clear Resume action.
- Successful purchases apply immediately. Invalid, unaffordable, capped, malformed, or wrong-status
  purchases leave authoritative state unchanged.
- A life prevents one game-ending collision and safely respawns the snake while retaining score, XP,
  level, unspent points, Extra XP levels, and remaining lives. A life is consumed. Existing behavior
  ends the game when no life remains.
- Run state and purchases reset on restart. The server owns XP, levels, points, perk purchases, lives,
  collision recovery, pause state, and snapshots. The browser renders validated snapshots and sends
  intended actions only.
- Keep current TypeScript/Vite client and TypeScript Node server. No database, persistence, accounts,
  online currency, new mode, third-party assets, provider integration, or broad refactor.
- No collectible powerups or Luck, Speed Boost, Shield pickup, Double Food, spawn rules, or effect
  timers are in this phase.

## Allowed files

Edit relevant files under `server/`, `src/game/`, `src/api/`, and `tests/`, plus `src/main.ts`,
`src/styles.css`, `index.html`, `docs/specs/BASE_GAME_SPEC.md` only for a path/name change (do not
change its contents), the feature documents under `specs/001-powerups-perks/`, and task entries in
`docs/tracking/WORK_LOG.md`, `docs/tracking/AI_USAGE_LOG.md`, and `docs/tracking/evidence/EVIDENCE_006.md`.

## Acceptance criteria

- XP thresholds, Extra XP awards/costs/cap, perk point awards, life costs/cap, purchases, collision
  recovery, and reset behavior match the feature spec.
- S and SHOP open the paused shop; S while paused toggles shop visibility without resuming; Resume
  continues play.
- HUD and shop display XP, level, perk points, Extra XP level, and life charges with numeric values
  and filled/empty cubes.
- Runtime action and snapshot validation rejects malformed or inconsistent values safely.
- Existing Snake controls/rules and the read-only Hint behavior continue to work.
- Focused tests cover thresholds, costs/caps, invalid purchases, life recovery, reset, and snapshot
  validation.

## Verification instructions

Run `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`. Manually verify the
shop flow, purchases, HUD, life recovery, pause/resume, and reset. Record exact outcomes in
Evidence 006. Distinguish automated checks from manual observations.
