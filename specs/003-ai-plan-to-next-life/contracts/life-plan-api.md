# Life Plan API Contract

## Request

`POST /api/games/:gameId/life-plan`

- Content type: JSON.
- Body: exactly `{}`.
- `gameId` follows the existing game route pattern; it is never sent to the provider or telemetry.
- Preconditions: game exists, is paused, request schema is exact, no other AI request for this game is in flight, and next-life charge cap is not reached.
- If the actual next-life price is already affordable, return a direct application result with zero provider/tool calls.
- Model ID, strategy, game state, context and prompt are not accepted from the browser.

## Success

HTTP 200 with exactly `{ "plan": PublicLifePlanResult }`. Client validates exact keys and compares `revision` with the current game snapshot before display.

`completed` contains backend-selected recommendation, trusted reason code, valid evidence IDs, optional bounded comparison and controlled assumptions/message. The client validates the assumption fields but does not append their technical text to the player-facing shop message. If already affordable, `source: "application"` and `recommendation: "buy_now"`. A model-assisted outcome uses `source: "validated_plan"`.

`incomplete` means no strategy reached the goal within 100 projected red foods; it never means impossible. `unavailable`, `stale` and `cancelled` include stable safe codes and no recommendation. Provider/tool internals and raw model text are never public.

## Request rejection

Use existing API error envelope for malformed/nonempty body, unknown game and wrong game status. A duplicate request or cross-action overlap returns a stable busy/unavailable result without another provider attempt. Maximum life charges return `unavailable/life_cap` before a provider call.

## Staleness and cancellation

The run captures one backend snapshot revision. Recheck game existence, paused status and revision before every tool execution and before returning a result. Purchase, resume, restart, pause transition or any new revision terminates as stale. Disconnect/cancellation aborts provider work where the server receives the signal; the client always discards a result after its local request is cancelled, shop closes, or its current revision changes. Total deadline remains authoritative if proxy abort does not propagate.

## Compatibility

This route and DTO are separate from `POST /api/games/:gameId/shop-advice`. Existing advice's body, response, timeout and fallback behavior stay unchanged. One shared per-game gate prevents either action from overlapping the other.
