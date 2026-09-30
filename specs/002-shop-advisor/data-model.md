# Data Model: Shop AI Advisor

## ShopAdviceContext

Server-derived, immutable input for one advice request. Never accepted from a browser body.

| Field | Type | Validation / meaning |
|---|---|---|
| `gameId` | string | Existing session identifier; used only server-side, not sent to Gemini |
| `revision` | nonnegative safe integer | Snapshot revision captured before model call |
| `status` | `paused` | Other statuses reject before provider call |
| `score` | nonnegative safe integer | Current run score |
| `xp` | nonnegative safe integer | Cumulative run XP |
| `level` | positive safe integer | Current level |
| `perkPoints` | nonnegative safe integer | Actual unspent balance, including Lucky bonuses |
| `extraXp` | `{level: 0..5, nextCost: 1..5 or null}` | `null` at cap; each level adds 2 XP per food |
| `luck` | `{level: 0..5, nextCost: 1..5 or null}` | `null` at cap; Lucky spawn chance is 5% + 5 points per level |
| `extraLife` | `{charges: 0..2, nextCost: 5 or 8 or null}` | `null` at two held charges; each charge survives one collision |

Only score, XP, level, points, and the three perk objects go into the Gemini user content. Game ID, revision, snake, board, food, and player ID are not sent to Gemini.

## ModelDecision

Exactly two required fields; no unknown keys.

| Field | Allowed values |
|---|---|
| `decision` | `buy_extra_xp`, `buy_luck`, `buy_extra_life`, `wait` |
| `reasonCode` | `faster_xp`, `more_lucky`, `collision_protection`, `save_points`, `cannot_afford`, `all_capped` |

Required pairings: Extra XP → `faster_xp`; Luck → `more_lucky`; +1 Life → `collision_protection`; wait → one of the three wait codes. `cannot_afford` is valid only when no available perk can be afforded; `all_capped` only when every perk is capped. `save_points` is valid for any paused shop. A buy decision is valid only when that perk has a non-null next cost and the current balance covers it.

## PublicAdviceResult

- Success: `{ status: "advice", revision, decision, reasonCode, message, model }`. `model` is one of the three allowlisted model IDs; `message` is generated locally from the decision, reason code, and current cost/effect.
- Unavailable: `{ status: "unavailable", revision, code, message }`. No `decision` or `model` field is present. `code` is a stable public category such as `not_configured`, `busy`, `cancelled`, `stale`, `invalid_provider_output`, or `temporarily_unavailable`.
- Invalid request/status/not found: existing HTTP error envelope with safe code and message; no provider metadata.

## State transitions

```text
idle → pending → advice
               → unavailable
pending → cancelled (shop closes, browser disconnects, or newer request)
```

The advice lifecycle does not change game state or revision. A game purchase, resume, or restart changes revision and makes any pending advice stale.

## ModelAttempt

The normal attempt order is Flash ×1, Flash-Lite ×2, then Gemma ×3 when eligible. A process-local primary-failure counter opens `primaryCongestedUntil` for 15 minutes after two consecutive transient Flash failures across logical requests.

Each completed attempt emits a server-only `AdviceAttemptTelemetry` record with an anonymous logical interaction ID, operation, provider/model/adapter, phase, global and per-model attempt numbers, attempt kind, safe status/error class, provider status, latency, fallback/congestion flags, and normalized usage when available. Request bodies, raw responses, keys, game/session IDs, and shop values are excluded.
