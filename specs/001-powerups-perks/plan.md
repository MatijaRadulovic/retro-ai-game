# Implementation Plan: Run XP, Perks, and Lucky Pickup

**Phase**: 1 — run progression, three purchasable perks, and one Lucky pickup
**Spec**: [spec.md](spec.md)
**Prompt**: [BUILD_PROMPT_POWERUPS_PERKS_V3.md](../../docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V3.md)

## Summary

Add food-based XP, derived run levels, level-up perk points, Extra XP, extra lives, a five-level Luck
perk, and one orange Lucky pickup that awards a perk point. The existing server remains authoritative.
Reuse current TypeScript/Vite structure and strict snapshot validation; add no dependency or
persistence.

## Technical context

- **Runtime**: existing TypeScript 5.7+, Node.js 22+, Vite client, Node HTTP/WebSocket server.
- **State**: one in-memory run state per game container; XP, points, perk levels, life charges, and
  active Lucky pickup reset on restart.
- **API**: existing `/api/games/:gameId` routes plus one paused-only perk purchase route.
- **Testing**: Node built-in tests with deterministic game-state fixtures; existing typecheck/test/
  build commands.
- **UI**: server snapshots drive HUD and shop; local state may track only whether the paused shop is
  visible.

## Design decisions

1. Store cumulative XP and unspent perk points; derive level from cumulative XP thresholds.
2. Add Extra XP and Luck (levels 0–5), extra-life charges (0–2), and one Lucky pickup.
3. Roll for an orange pickup after red food is eaten using `5% + 5% × Luck level`; allow only one
   active pickup and award one perk point on collection without score/XP/growth.
4. Implement perk purchases as pure atomic rules, then expose them through the session manager and
   existing HTTP API.
5. Life recovery keeps run progression and uses the safe three-segment start formation; preserve or
   relocate a Lucky pickup so it does not overlap food or snake.
6. Extend the validated snapshot; client does not calculate or optimistically apply purchases.
7. The base spec was previously renamed to `BASE_GAME_SPEC.md`; keep its contents unchanged.

## Phase 1 scope

1. Update the feature evidence and create focused progression/purchase/life tests.
2. Implement XP, level derivation, perk point awards, and Extra XP/Luck state and purchases.
3. Implement +1 Life purchases, collision respawn, and the Lucky pickup roll/collection transition.
4. Extend snapshot/API validation and render XP/perk HUD plus the paused shop and orange pickup.
5. Run automated checks and manually verify shop, pickup, purchase, life, pause/resume, and reset.

## Not in Phase 1

Other collectible items/effects, Speed Boost, Shield pickup, Double Food, effect timers, persistent
progression, accounts, online currency, databases, live AI/provider work, and changes to the base
game rules document.

## Verification

Run `npm run typecheck`, `npm test`, `npm run build`, `git diff --check`, focused link checks, and
manual scenarios in [quickstart.md](quickstart.md). Record actual outputs and skipped checks in
[`EVIDENCE_007.md`](../../docs/tracking/evidence/EVIDENCE_007.md).
