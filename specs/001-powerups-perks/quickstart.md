# Quickstart: XP, Perks, and Lucky Pickup

These are validation scenarios. Record Luck/Lucky pickup outcomes in
[`EVIDENCE_007.md`](../../docs/tracking/evidence/EVIDENCE_007.md) and earlier XP/perk outcomes in
[`EVIDENCE_006.md`](../../docs/tracking/evidence/EVIDENCE_006.md).

## Automated scenarios

1. XP at 40→50 and 140→150; one award crossing multiple thresholds; Extra XP level 0–5 awards.
2. Exact Extra XP costs/cap and Life costs/cap; insufficient, malformed, and wrong-status purchases
   leave state and revision unchanged.
3. Wall and self collision with zero, one, or two held lives; verify one charge consumed, safe snake,
   continued game, and retention of score/progression/perks.
4. Restart clears all new run values while preserving existing container/player IDs.
5. Valid and invalid expanded snapshots; core Snake/session/API/Hint regressions.
6. Luck level 0–5 costs/cap; spawn rolls at 5% increments; only one Lucky pickup; free-cell placement.
7. Eating the orange pickup adds exactly one perk point without score, XP, or growth; restart clears
   Luck/pickup and life recovery retains Luck with no item overlap.

## Manual browser scenarios

1. During play, press S and activate SHOP; verify the authoritative pause precedes the shop overlay
   on top of the game board.
2. While paused with the shop closed, press S/SHOP and verify the overlay opens while remaining paused.
3. While the shop is open, press S/SHOP or CLOSE SHOP and verify the overlay closes and play resumes.
4. Buy Extra XP and +1 Life at exact displayed costs; verify the next snapshot/HUD updates.
5. Pause with P/Space/pause button, open SHOP, and verify the run stays paused until the shop closes.
6. Confirm Luck's 0/5 UI and orange pickup distinguish it from the red food.
7. Use a life in a deterministic collision setup if the UI offers one; otherwise record collision
   recovery as automated-only evidence.
8. Verify Luck level and Lucky pickup reset on restart; verify life recovery does not overlap either
   food item.
9. Restart and verify XP, level, points, perk levels, and lives reset.

## Project gates

Run from repository root: `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`.
Record exact output, exit status, and manual scenario status in Evidence 006. The initial planning
pass skipped code checks; the implementation pass records its actual gate results separately.
