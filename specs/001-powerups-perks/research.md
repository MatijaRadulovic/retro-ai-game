# Phase 0 Research: Run Powerups and Perks

## Decision 1 — One authoritative run aggregate

**Decision**: Extend the existing pure `GameState` as the single run aggregate. It owns the snake,
food, score, status, progression, purchased perks, held lives, board powerup, active effects, and
accumulated active-play time. The server session remains the only owner of that state.

**Rationale**: Restart, food awards, collision recovery, and snapshots can each be one atomic state
transition. This preserves the current engine/session boundary and prevents parallel client/server
sources of truth.

**Alternatives considered**: Separate progression/effect services or browser-owned perk state were
rejected as unnecessary for one in-memory player and inconsistent with server authority.

## Decision 2 — Canonical XP and derived levels

**Decision**: Store cumulative `xp` and unspent `perkPoints`; derive the level with cumulative
threshold `T(level) = 25 × (level - 1) × level`. An award grants `newLevel - oldLevel` perk points.
Store Luck and Extra XP as integers 0–5 and held lives as 0–2.

**Rationale**: A derived level cannot drift from XP and automatically handles a single award crossing
multiple thresholds. Pure typed purchase results can return the identical state on failure.

**Alternatives considered**: Storing mutable XP and level together or incrementing one XP at a time
was rejected because either permits inconsistent state or adds needless work.

## Decision 3 — Atomic food transition ordering

**Decision**: A food pickup performs this order in one pure transition:

1. Calculate base XP as `10 + 2 × Extra XP level`.
2. Apply Double Food to the complete XP award and configured score award.
3. Grow exactly one segment and consume one Double Food use when applicable.
4. Apply cumulative XP, every crossed level, and corresponding perk points.
5. Place replacement food, applying the food-priority near-full-board rule.
6. If no board powerup exists and an eligible cell remains, run chance, type, and cell selection.
7. Set `won` only when no non-snake cell exists.

**Rationale**: Score, XP, growth, level awards, food placement, and spawn behavior cannot partially
update or disagree.

**Alternatives considered**: Applying Extra XP after doubling or handling progression in the session
manager was rejected because both make award rules easier to split or duplicate.

## Decision 4 — Bounded deterministic randomness

**Decision**: Keep the existing injected `() => number` source and document draw order. Enumerate free
cells and choose by index; use `roll < chance` for exact 5–30% boundaries. Food placement runs before
powerup chance, type, and eligible-cell selection.

**Rationale**: A 400-cell enumeration is bounded, uniform, and deterministic in tests. No dependency
or retry loop is needed.

**Alternatives considered**: Rejection sampling, client-side random placement, and a seeded-random
library were rejected for brittleness, authority violations, or unnecessary scope.

## Decision 5 — Effects and active-play time

**Decision**: Track effects independently so different types coexist:

- Speed Boost: `speedBoostUntilActiveMs`
- Shield: `shieldUntilActiveMs`; a non-expired value is its one collision charge
- Double Food: `doubleFoodRemainingPickups` from 0 to 3

The game state stores monotonic accumulated `activePlayMs`. The manager injects `nowMs()`, keeps a
private `playingSinceMs` while playing, and settles elapsed time before ticks and accepted mutating
actions. Pause settles then stops accumulation; resume starts it again. Same-type timed pickups set
expiration to `activePlayMs + 5000`; Double Food resets to 3.

**Rationale**: Pause is excluded exactly, delayed callbacks do not lengthen or shorten effects, clock
jumps can be controlled, and game rules remain pure when given settled active time.

**Alternatives considered**: Nominal tick decrement, wall-clock expiry values, and separate effect
timers were rejected because they mishandle delayed ticks, pauses, system-clock changes, or cleanup.

## Decision 6 — Collision defense and respawn

**Decision**: After expiring timed effects, resolve a collision in this order:

1. Consume an active Shield, cancel movement, keep the snake at its safe position, and reset a
   colliding queued direction to the last committed direction.
2. Otherwise consume one life, replace the snake with the standard three-segment formation/direction,
   retain score and permanent run progression/perks, clear all temporary effects, resolve item
   overlap, and remain playing.
3. Otherwise enter `game_over`.

**Rationale**: Shield precedence matches the feature contract. Resetting the failed queued direction
lets the player choose a safe correction under the existing opposite-direction guard. Respawn remains
atomic and preserves score-based pace.

**Alternatives considered**: Move-then-undo, rebuilding through a full new-run initializer, or
consuming life first were rejected because they risk transient invalid state, reset progression, or
violate precedence.

## Decision 7 — One purchase intent route without optimistic state

**Decision**: Add `POST /api/games/:gameId/perks` with exact body
`{ "perk": "luck" | "extra_xp" | "extra_life" }`. Each accepted request buys one next level/charge;
the UI disables its initiating button while pending. Malformed, wrong-status, unaffordable, and
capped requests return typed errors and leave state/revision unchanged.

**Rationale**: The feature does not require idempotency or stale-revision rejection. The Node event
loop serializes requests, so each valid repeated intent is evaluated against the latest state and may
legitimately buy another level when affordable. The exact body is the smallest required contract.

**Alternatives considered**: An `expectedRevision` field would protect accidental double submission
but adds a concurrency contract not requested after clarification. Request-ID registries or one route
per perk add more state or duplication.

## Decision 8 — Strict expanded snapshots

**Decision**: Extend the sole player with progression, perk rows (including authoritative next cost),
and effect status; extend shared board state with one nullable powerup. Runtime parsing rejects unknown
or missing keys, unsafe integers, invalid ranges/caps, level/XP mismatch, wrong next cost, duplicate or
overlapping cells, invalid types, and malformed effect values. WebSocket events accept only exact
`{ type: "snapshot", game }` envelopes; malformed events preserve the last valid display.

**Rationale**: The client can render without reimplementing prices or rules, and FR-026 requires
relational consistency rather than type checks alone. The local server and browser ship together, so
an atomic contract expansion does not need protocol version negotiation.

**Alternatives considered**: Type assertions, clamping invalid values, flat feature fields, and a
second client-side model were rejected because they trust malformed data or duplicate authority.

## Decision 9 — Reuse the overlay and provide equivalent controls

**Decision**: Reuse the current board overlay with normal-pause and shop views. Keep `shopVisible`
client-local, but open only after a validated paused snapshot. S and a visible SHOP button share the
same behavior; P, Space, Resume, the pause button, restart, and any non-paused snapshot close the shop.
Global shortcuts ignore interactive targets. Shop rows expose numeric values plus decorative cubes,
authoritative next cost, one `+` button, a polite status region, and a clear Resume action.

**Rationale**: This is the smallest UI extension, gives touch-only users equivalent access, prevents
Space on a focused `+` button from accidentally resuming, and keeps cubes understandable to assistive
technology.

**Alternatives considered**: S-only access excludes touch users. A second modal or native dialog adds
focus/modal complexity to a compact board overlay. Icon-only or color-only displays are ambiguous.

## Decision 10 — Verification seams

**Decision**: Add scripted random sequences and a fake monotonic clock to focused pure/session tests.
Cover progression boundaries, price/cap failures, spawn roll/type/cell selection, effect refresh and
expiry, pause freezing, collision matrix, reset, HTTP errors, snapshot inconsistencies, and unchanged
Hint keys. Use manual browser checks for controls, focus, cubes, responsive layout, and visual cues.

**Rationale**: Random five-second effects cannot be evidenced reliably with ad hoc browser play. Two
small injected seams make the behavior repeatable without a dependency or global fake timers.

**Alternatives considered**: Real-time waits, manual-only random collection, and a DOM testing
framework were rejected as nondeterministic or outside the existing toolchain.

## Resolved conflicts and follow-up ownership

- FR-019 was aligned with FR-023: Shield cancellation does not consume Double Food, while a life
  respawn clears all temporary effects.
- The feature specification adds a visible SHOP control so the S flow is available to touch users.
- `docs/specs/GAME_SPEC.md` still excludes levels, lives, and powerups. The first implementation task
  must update that owning product specification before behavior code changes.
- `docs/specs/TOOL_CONTRACT.md` remains unchanged; feature data is not added to the Hint snapshot.
