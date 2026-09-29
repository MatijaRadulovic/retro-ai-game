# BUILD PROMPT — RETRO SNAKE XP, perks, and Lucky pickup

**Version:** v3

## Goal

Extend the approved run XP/perks feature with a five-level Luck perk and one orange Lucky pickup
that awards a perk point. Update the feature artifacts and implement the feature without changing
the Base Game Specification contents.

## Accepted source priority

1. Current user request and explicit assumptions below.
2. `AGENTS.md` and relevant instructions linked from [`docs/INSTRUCTIONS.md`](../../INSTRUCTIONS.md).
3. [`docs/specs/BASE_GAME_SPEC.md`](../../specs/BASE_GAME_SPEC.md), unchanged.
4. The XP/perks feature spec, plan, data model, API contract, tasks, and quickstart.
5. Existing code and tests as evidence of current behavior.

## Scope and assumptions

- Add Luck levels 0–5. Each next level costs 1–5 perk points, matching Extra XP.
- Red food remains unchanged. An orange Lucky pickup may spawn after red food is eaten when no Lucky
  pickup is active. Base chance is 5%; each Luck level adds 5 percentage points, capped at 30%.
- Spawn one Lucky pickup on a free cell that overlaps neither snake, red food, nor another pickup.
- Eating it awards exactly one perk point, clears it, and does not change score, XP, or snake length.
- Luck and any active pickup reset on restart. Life recovery preserves Luck and safely preserves or
  relocates the pickup.
- The backend remains authoritative; update strict snapshot validation and render the Lucky pickup
  orange. Add Luck to the existing perk row/shop without adding other items.
- Preserve server authority, the read-only Hint contract, all existing behavior, and the renamed base
  game spec's unchanged content.
- No other collectible effects, timers, persistence, accounts, new game modes, assets, dependencies,
  or live AI/provider work.

## Allowed files

Relevant feature docs under `specs/001-powerups-perks/`, this prompt, tracking entries/evidence 007,
and existing `server/`, `src/game/`, `src/api/`, `src/main.ts`, `src/styles.css`, `index.html`, and
`tests/`. Do not edit `docs/specs/BASE_GAME_SPEC.md` contents.

## Acceptance criteria

- Luck purchases are paused-only, atomic, 0–5, and cost 1–5; rejection preserves state and revision.
- Spawn chance uses the specified formula; deterministic tests cover probability boundaries, active
  pickup limits, and non-overlapping placement.
- The orange pickup awards one point only. Restart resets Luck/pickup; life recovery retains Luck and
  avoids item overlap.
- Snapshots reject missing, unknown, malformed, overlapping, out-of-range, or inconsistent Luck data.
- HUD and shop show Luck 0/5 with filled/empty cubes; orange pickup is visually distinct from red food.
- Existing Snake, XP/perk, API, and read-only Hint tests continue to pass.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`, and focused Markdown-link
checks. Record actual output in Evidence 007. Manual browser QA is separate and must not be claimed if
no browser is available.
