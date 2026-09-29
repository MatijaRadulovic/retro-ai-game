# Quickstart Validation: Run Powerups and Perks

This guide defines runnable acceptance scenarios for the implemented feature. It is not evidence that
they have passed; actual results belong in `docs/tracking/evidence/EVIDENCE_006.md`.

## Prerequisites

- Node.js 22 or newer
- Dependencies installed with `npm install`
- Implementation tasks in [tasks.md](tasks.md) completed for the scenario being checked
- Product rules aligned with [spec.md](spec.md), [data-model.md](data-model.md), and the
  [API contract](contracts/game-api.md)

## Automated gates

Run from the repository root:

```sh
npm run typecheck
npm test
npm run build
git diff --check
```

Expected outcome: every command exits 0. `npm test` includes deterministic feature scenarios and all
existing core/Hint regressions. Record the exact test count and output rather than copying this
expectation as a result.

## Local browser setup

Start the backend:

```sh
npm run dev:server
```

In another terminal start the client:

```sh
npm run dev
```

Open the Vite URL printed by the client (normally `http://localhost:5173`).

## Frozen acceptance scenarios

### Q1 — Progression boundaries and reset

**Automated setup**: Use deterministic food positions and state fixtures at 40, 50, 140, 150, and a
multi-threshold XP award.

**Expected**:

- Normal food grants `10 + 2 × Extra XP level` XP.
- Levels begin at cumulative XP 0, 50, 150, and 300.
- Each crossed level grants one point exactly once.
- Double Food doubles the complete XP and score award but grows once.
- Restart returns all feature state to initial values while preserving container/player IDs.

### Q2 — Perk shop and purchase failures

**Automated setup**: Use paused session fixtures with exact point balances for every cost and cap, then
send valid and malformed purchase requests.

**Manual steps**:

1. During play press S; repeat using the visible SHOP control on a touch-sized viewport.
2. While paused, use S/SHOP to hide and show the shop.
3. Inspect points, numeric values, cubes, next cost, `MAX`, and plus-only controls.
4. Activate one affordable `+`, then Resume.

**Expected**:

- Opening the shop pauses before it appears and no movement occurs while paused.
- A successful purchase changes the next validated snapshot immediately.
- Malformed, wrong-status, unaffordable, and capped purchases return the documented 400/409 error,
  mutate nothing, publish nothing, and leave revision unchanged.
- P, Space, pause button, Resume, restart, and a non-paused snapshot close shop presentation state.
- Space/Enter on a focused purchase button activates that button rather than the global pause shortcut.

### Q3 — Powerup spawn and effects

**Automated setup**: Script random values at each Luck chance boundary, each type partition, and first,
middle, and last eligible cells. Use a fake monotonic clock.

**Expected**:

- Chance is exactly 5%, 10%, 15%, 20%, 25%, and 30% for Luck 0–5.
- At most one item spawns, only after food, uniformly by type and eligible cell.
- Speed reduces the normal interval by 25%, floors at 60 ms, lasts 5 seconds of active play, freezes
  on pause, and refreshes without stacking.
- Shield refreshes to one protected collision and expires after 5 seconds of active play.
- Double Food affects exactly three food pickups, resets to three on recollection, and does not alter
  growth.
- Different effects can coexist. Restart and life respawn clear them all.
- A powerup on the only food-eligible cell is removed so food can occupy it; won occurs only on a full
  snake board.

**Manual observation**: Confirm all three board items use different shape/text cues, not color alone,
and the board remains readable. Do not claim all random types were manually observed unless they were.

### Q4 — Collision defense matrix

**Automated setup**: Construct deterministic wall and self collisions with no defense, Shield only,
life only, and both.

**Expected**:

- No defense enters game over.
- Shield consumes only Shield, cancels the move, retains the safe snake, and allows a safe next turn.
- Life consumes exactly one charge, safely respawns three segments, retains score/XP/points/Luck/Extra
  XP, clears effects, resolves board conflicts, and continues playing.
- Both consumes only Shield first.
- A later life purchase costs 5 or 8 based on currently held charges.

### Q5 — Snapshot and read-only Hint regressions

**Automated setup**: Mutate one snapshot property at a time: missing/extra key, invalid number/range,
level mismatch, wrong next cost, duplicate snake cell, board overlap, bad type, and malformed WebSocket
envelope.

**Expected**:

- Every invalid snapshot/event is rejected as a whole and the last valid client state is preserved.
- Valid expanded snapshots round-trip unchanged.
- Multiple game containers remain isolated.
- Hint tool call count, allowed fields, safe failures, and unchanged game state still pass; Hint output
  contains no new feature data.

## Manual presentation matrix

Check each of these view conditions and record actual observations:

| View | Required observation |
|---|---|
| Desktop | HUD, board, shop rows, and Resume fit without covering purchase information |
| 480 px wide | Cubes/numeric labels wrap legibly; touch directions and SHOP remain reachable |
| 320 px wide | Shop scrolls within the viewport; no horizontal overflow or clipped focused control |
| Short viewport | Board and shop remain usable without trapping controls off-screen |
| Keyboard only | Logical tab order, visible focus, Enter/Space purchase, focus restoration after close |
| Reduced motion | No required status depends on animation; brief decorative motion is suppressed |

## Evidence handoff

For implementation, update Evidence 006 with:

- starting revision/working-tree state and baseline commands;
- these Q1–Q5 expectations before code edits;
- one bounded change per recorded iteration;
- the exact automated outputs and manual status after each relevant iteration;
- failures, skipped checks, environment constraints, and unobserved random/manual cases.
