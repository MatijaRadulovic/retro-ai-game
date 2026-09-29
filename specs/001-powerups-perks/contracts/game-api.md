# Game API Contract Addendum: Run Powerups and Perks

This addendum extends the existing contract in `docs/specs/GAME_SPEC.md`. Existing health, create,
read, move, pause, resume, restart, and WebSocket routes retain their methods and error envelope.

## Purchase a perk

```http
POST /api/games/:gameId/perks
Content-Type: application/json
```

Exact request body:

```json
{
  "perk": "luck"
}
```

`perk` MUST be exactly one of:

- `luck`
- `extra_xp`
- `extra_life`

No field is optional and extra fields are rejected.

### Success

```http
HTTP/1.1 200 OK
Content-Type: application/json
```

```json
{
  "game": { "...": "complete authoritative GameSnapshot" }
}
```

On success the server atomically deducts the exact current cost, increments one level or held charge,
increments the game revision exactly once, broadcasts the resulting snapshot exactly once, and
returns that same snapshot shape.

### Failure matrix

| HTTP | Error code | Condition |
|---:|---|---|
| 400 | `invalid_purchase` | Body is not an exact object containing one allowed string `perk` field |
| 404 | `game_not_found` | `gameId` does not identify an active in-memory container |
| 409 | `invalid_status` | Run is not paused |
| 409 | `insufficient_perk_points` | Current unspent points are below the derived next cost |
| 409 | `perk_at_cap` | Luck/Extra XP is level 5 or two lives are currently held |

Every error retains the existing envelope:

```json
{
  "error": {
    "code": "perk_at_cap",
    "message": "This perk is already at its current cap."
  }
}
```

Every failed request leaves the entire game state and revision unchanged and sends no WebSocket
snapshot. A later repeated valid intent is evaluated against the latest authoritative state; it is a
new purchase, not an idempotent replay.

## Expanded snapshot

The top-level shape remains exact:

```json
{
  "id": "game-id",
  "revision": 12,
  "config": { "...": "existing validated GameConfig" },
  "configError": null,
  "players": [
    {
      "id": "player-id",
      "snake": [{ "x": 10, "y": 10 }],
      "direction": "right",
      "queuedDirection": "right",
      "score": 7,
      "progression": {
        "xp": 90,
        "level": 2,
        "perkPoints": 0
      },
      "perks": {
        "luck": { "level": 1, "nextCost": 2 },
        "extraXp": { "level": 0, "nextCost": 1 },
        "extraLife": { "charges": 1, "nextCost": 8 }
      },
      "effects": {
        "speedBoostRemainingMs": 4200,
        "shieldRemainingMs": 0,
        "doubleFoodRemainingPickups": 2
      }
    }
  ],
  "state": {
    "food": { "x": 4, "y": 8 },
    "powerup": {
      "type": "shield",
      "position": { "x": 15, "y": 5 }
    },
    "status": "playing"
  }
}
```

The abbreviated `config` and snake examples above illustrate placement only; actual responses contain
the complete existing config and complete snake.

### Runtime validation

The browser accepts the snapshot only when all existing rules and these feature rules pass:

- Every object has exactly its documented keys.
- XP, level, perk points, perk levels/charges, remaining milliseconds, and remaining pickups are safe
  integers within the ranges in `data-model.md`.
- Reported level equals the level derived from XP, and unspent points do not exceed points earned by
  level gains.
- Every `nextCost` matches the authoritative current level/held-charge schedule or is `null` at cap.
- Snake cells are unique; food and powerup are in bounds and overlap neither snake nor each other.
- Powerup type is one of the three exact strings.
- A ready snapshot contains initial progression/perks/effects and no board powerup.

An invalid HTTP success body raises client error `invalid_server_response`; it is never partially
rendered. An invalid WebSocket event is ignored in full and the last valid snapshot remains displayed.

## WebSocket event envelope

The existing URL remains:

```text
/api/games/:gameId/events
```

The browser accepts only this exact envelope:

```json
{
  "type": "snapshot",
  "game": { "...": "expanded GameSnapshot" }
}
```

Missing or extra envelope fields, a different type, invalid JSON, or an invalid nested snapshot are
ignored safely. The connection remains read-only; any client message still closes it under the
existing policy.

## Browser intent and display behavior

- The client adds `purchasePerk(gameId, perk)` and submits no calculated price or resulting level.
- Purchase 400/409 errors appear in the shop status region and do not mark the server offline.
- Network/unparseable-success failures retain the existing server-unavailable/invalid-response path.
- Snapshots older than the current revision are ignored. Equal-revision snapshots MUST be identical
  projections; the client may ignore them without rerendering.
- Shop visibility never enters this contract. It is local presentation state gated by authoritative
  paused status.

## Hint boundary

The `get_game_state` input, output, allowlist, and failure contract remain unchanged. No progression,
perk, life, board-powerup, or effect field is added to the Hint snapshot.
