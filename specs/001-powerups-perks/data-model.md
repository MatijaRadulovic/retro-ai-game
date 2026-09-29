# Data Model: Run XP and Perks

## Run progression

| Field | Type | Rule |
|---|---|---|
| `xp` | nonnegative safe integer | Cumulative XP in this run |
| `level` | derived positive integer | Highest level whose cumulative threshold is met |
| `perkPoints` | nonnegative safe integer | Earned points remaining after purchases |

`threshold(level) = 25 × (level - 1) × level`. Thus levels 2, 3, and 4 begin at 50, 150, and 300
XP. For one award, grant `newLevel - oldLevel` perk points.

## Perks

| Perk | Stored value | Cap | Next cost |
|---|---|---:|---|
| Extra XP | `extraXpLevel` | 5 | Current level + 1 points |
| Extra Life | `extraLives` | 2 | 5 points at 0 held; 8 at 1 held; unavailable at cap |
| Luck | `luckLevel` | 5 | Current level + 1 points |

Food awards `10 + 2 × extraXpLevel` XP. Costs apply by next purchased level, so Extra XP costs are
1, 2, 3, 4, and 5. Life cost depends on currently held charges, not lifetime purchases. Luck
levels cost 1, 2, 3, 4, and 5 points. A red-food pickup triggers one spawn roll only when no Lucky
pickup is active. Chance is `0.05 + 0.05 × luckLevel`, from 5% at level 0 to 30% at level 5. At most
one orange Lucky pickup exists. Eating it grants one perk point and does not change score, XP, or
snake length.

## Collision recovery

With no charge, a wall or self collision uses existing `game_over` behavior. With a charge, consume
one, keep the run playing, and place the normal three-segment snake at its starting position and
direction. Retain score, XP, derived level, unspent points, Extra XP level, Luck, and remaining
charges. Clear queued direction; ensure red food and any Lucky pickup do not overlap the respawn snake
or each other. Relocate a conflicting Lucky pickup to a free cell when possible.

## Snapshot projection and validation

Add to the sole `PlayerState`:

```ts
progression: { xp: number; level: number; perkPoints: number };
perks: {
  extraXp: { level: number; nextCost: number | null };
  extraLife: { charges: number; nextCost: 5 | 8 | null };
  luck: { level: number; nextCost: number | null };
};
```

The container `state` also includes `luckyPickup: Point | null`. Require exact keys, safe nonnegative
integers, level matching XP, Extra XP and Luck `0..5`, lives `0..2`, and `nextCost` matching the
current value or null at cap. Perk points may exceed levels earned because Lucky pickups grant bonus
points; points must remain a safe nonnegative integer. A Lucky pickup is null or
a valid point distinct from snake and red food. Ready snapshots have zero XP/points/perks/lives,
level 1, and no Lucky pickup. No other powerup/effect fields exist.
