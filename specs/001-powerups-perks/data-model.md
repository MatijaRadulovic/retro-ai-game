# Data Model: Run Powerups and Perks

## Domain types

### PowerupType

Allowed values:

- `speed_boost`
- `shield`
- `double_food`

### PerkName

Allowed purchase values:

- `luck`
- `extra_xp`
- `extra_life`

## Authoritative run aggregate

The existing `GameState` remains the one pure authoritative run value and gains the following nested
state. Names below describe the contract; final TypeScript may use equivalent nearby naming if it
preserves every invariant.

### RunProgression

| Field | Type | Constraint | Meaning |
|---|---|---|---|
| `xp` | integer | safe integer, `>= 0` | Cumulative XP for this run |
| `perkPoints` | integer | safe integer, `0 <= value <= derivedLevel - 1` | Earned level points not yet spent |

`level` is derived, never independently mutated:

```text
threshold(level) = 25 × (level - 1) × level
level(xp) = greatest level L where xp >= threshold(L)
```

Examples: level 1 starts at 0 XP, level 2 at 50, level 3 at 150, and level 4 at 300.

### PerkState

| Field | Type | Constraint | Meaning |
|---|---|---|---|
| `luckLevel` | integer | `0..5` | Adds 5 percentage points per level to 5% spawn chance |
| `extraXpLevel` | integer | `0..5` | Adds 2 XP per food before Double Food multiplication |
| `extraLives` | integer | `0..2` | Held collision-recovery charges |

Next costs are derived:

| Current value | Luck next cost | Extra XP next cost | Extra Life next cost |
|---:|---:|---:|---:|
| 0 | 1 | 1 | 5 |
| 1 | 2 | 2 | 8 |
| 2 | 3 | 3 | cap |
| 3 | 4 | 4 | — |
| 4 | 5 | 5 | — |
| 5 | cap | cap | — |

After a life is consumed, the next cost is again derived from currently held charges.

### ActiveEffects

| Field | Type | Constraint | Meaning |
|---|---|---|---|
| `speedBoostUntilActiveMs` | integer or `null` | when set, safe integer `> activePlayMs` and `<= activePlayMs + 5000` at activation | Expiration on the run's active clock |
| `shieldUntilActiveMs` | integer or `null` | same constraint as Speed Boost | Expiration; presence represents one Shield collision charge |
| `doubleFoodRemainingPickups` | integer | `0..3` | Food pickups still receiving doubled score/XP |

Same-type pickup refreshes/replaces these values; it never adds duration, magnitude, shield charges,
or Double Food uses.

### BoardPowerup

| Field | Type | Constraint | Meaning |
|---|---|---|---|
| `type` | `PowerupType` | exact allowed value | Benefit collected on entry |
| `position` | `Point` | in bounds; not on snake or food | One uncollected board item |

The aggregate contains `powerup: BoardPowerup | null`; no second board powerup can coexist.

### Active-play clock

| Field | Owner | Constraint | Meaning |
|---|---|---|---|
| `activePlayMs` | `GameState` | nonnegative safe integer, monotonic during a run | Accumulated time while status was `playing` |
| `playingSinceMs` | private session state | finite monotonic clock value or absent | Unsettled start time for current playing interval |

Ready, paused, game-over, and won time never increments `activePlayMs`. Restart sets it to zero.

## Existing GameState additions

```text
GameState
├── snake, direction, queuedDirection, food, score, status   (existing)
├── progression: RunProgression
├── perks: PerkState
├── powerup: BoardPowerup | null
├── effects: ActiveEffects
└── activePlayMs: nonnegative integer
```

Additional invariants:

- Snake cells are unique, in bounds, and the first segment is the head.
- Food is null only for a won/full-board state; otherwise it is in bounds and not on the snake.
- Board powerup does not overlap snake or food.
- A settled state canonicalizes expired timed effects to `null`.
- Ready/new-run state contains the three-segment starting snake, initial progression/perks/effects,
  no board powerup, score 0, and active play 0.
- A life respawn has the same three-segment spatial formation as a new run but is still `playing` and
  retains score, XP, perk points, Luck, and Extra XP.

## Snapshot projection

The server projects domain state into the existing single-player snapshot shape.

### PlayerState additions

```text
progression: {
  xp: integer,
  level: integer,          // must equal deriveLevel(xp)
  perkPoints: integer
}
perks: {
  luck: { level: integer 0..5, nextCost: integer 1..5 | null },
  extraXp: { level: integer 0..5, nextCost: integer 1..5 | null },
  extraLife: { charges: integer 0..2, nextCost: 5 | 8 | null }
}
effects: {
  speedBoostRemainingMs: integer 0..5000,
  shieldRemainingMs: integer 0..5000,
  doubleFoodRemainingPickups: integer 0..3
}
```

Remaining milliseconds are derived from the settled `activePlayMs` captured at the snapshot revision,
not from a browser clock. Values at the same revision therefore remain stable.

### GameContainerState addition

```text
powerup: {
  type: "speed_boost" | "shield" | "double_food",
  position: Point
} | null
```

### Snapshot validation relationships

- Exact required keys only at every feature object layer.
- `level` must match `xp`; `perkPoints <= level - 1`.
- Perk levels/charges and remaining effect values obey their ranges.
- `nextCost` exactly matches the current level/charge or is `null` at cap.
- Every snake point is unique and all points are in bounds.
- Food and board powerup cannot overlap each other or the snake.
- A ready snapshot uses initial progression/perks/effects and has no board powerup.
- Existing one-player, configuration, direction, status, score, and revision validation remains.

## State transitions

### New run / restart

Set all new feature state to initial values. Restart retains container/player IDs and publishes one new
revision; creating a run begins at revision 0.

### Food pickup

1. Calculate `baseXp = 10 + 2 × extraXpLevel`.
2. If Double Food remains, award `2 × baseXp` and `2 × scorePerFood`, grow once, then decrement one
   use. Otherwise award base XP and normal score, still growing once.
3. Derive old/new level and add their difference to `perkPoints`.
4. Replace food, resolving the near-full-board priority rule.
5. If no board powerup exists, apply Luck chance and optional type/cell selection.

### Perk purchase

Allowed only in `paused`. Derive next cost, check points and cap, then atomically subtract cost and
increment one level/charge. Any failure returns a typed reason and the identical state object.

### Powerup collection

Entering a powerup cell removes the board item without score, XP, or growth, then:

- Speed Boost: set expiration to `activePlayMs + 5000`.
- Shield: set expiration to `activePlayMs + 5000`.
- Double Food: set remaining pickups to 3.

### Pause / resume

Pause first settles elapsed active time, canonicalizes expired effects, changes status to paused, and
clears `playingSinceMs`. Resume changes status to playing and records a new `playingSinceMs`; no effect
duration changes while paused.

### Collision

- Active Shield: clear Shield, cancel spatial movement, keep playing, reset queued direction to the
  committed direction.
- Else life available: decrement life, create safe starting formation, retain permanent run values,
  clear all effects, resolve food/powerup overlap, keep playing.
- Else: enter game over under the existing rule.

### Win

The run becomes won only when the snake occupies all 400 cells. If an existing board powerup occupies
the only non-snake cell when replacement food is needed, remove that powerup and place food there.
