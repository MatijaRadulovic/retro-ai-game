# API Contract: Perk Purchases

This adds one route to the existing JSON API. Existing routes and the standard
`{ error: { code, message } }` error envelope remain unchanged.

## Purchase one perk

```http
POST /api/games/:gameId/perks
Content-Type: application/json
```

Exact body:

```json
{ "perk": "extra_xp" }
```

Allowed values are `extra_xp`, `extra_life`, and `luck`. Extra fields, missing values, non-string
values, and unknown perk names return HTTP 400 `invalid_purchase`.

### Success

Return HTTP 200 with `{ "game": <complete validated GameSnapshot> }`. The server atomically deducts
the current cost, updates the perk, increments revision once, and publishes the same snapshot.

### Rejections

| Status | Code | Condition |
|---:|---|---|
| 400 | `invalid_purchase` | Invalid exact request body |
| 404 | `game_not_found` | Unknown game ID |
| 409 | `invalid_status` | Run is not paused |
| 409 | `insufficient_perk_points` | Not enough unspent points |
| 409 | `perk_at_cap` | Extra XP or Luck level 5, or two life charges already held |

Every rejection leaves game state and revision unchanged and publishes no snapshot.

## Snapshot extension

The complete existing `GameSnapshot` is retained. Feature additions are `progression` and `perks`
under the single player, plus `state.luckyPickup`, as defined in [data-model.md](../data-model.md).
Runtime client validation rejects missing, unknown, malformed, out-of-range, overlapping, or
inconsistent feature data. WebSocket continues to send read-only snapshots and accepts no commands.

## Hint boundary

Do not change `get_game_state` input/output or add XP, perk, life, or Lucky pickup fields to its
sanitized snapshot.
