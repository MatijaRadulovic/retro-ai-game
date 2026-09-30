# Read-Only Shop State Contract

The current shop advisor replaces the historical `get_game_state` movement-Hint tool. Gemini does not propose or execute tool calls. The backend derives one sanitized shop state from the authoritative paused game, then sends only its allowed fields to Gemini. The [feature data model](../../specs/002-shop-advisor/data-model.md) and [HTTP contract](../../specs/002-shop-advisor/contracts/shop-advice-api.md) provide exact shapes.

## Caller and effect

- Caller: one user-triggered request to the paused shop advice endpoint.
- Read/write: strictly read-only. The operation cannot buy a perk, move the snake, pause/resume, restart, alter a timer, or publish a new game revision.
- Preflight: reject unknown game, non-paused status, nonempty/invalid request body, and overlapping requests before any provider call.

## Allowed context

The server may derive score, cumulative XP, current level, actual unspent perk points, Extra XP/Luck levels, held +1 Life charges, current next prices, and documented effects. The server keeps the game ID and revision only to check staleness; neither is sent to Gemini. It excludes the full snake, board, food coordinates, session internals, secrets, source, browser storage, and other players' games.

## Model output

Gemini must return exactly `{decision, reasonCode}` with no extra fields. `decision` is `buy_extra_xp`, `buy_luck`, `buy_extra_life`, or `wait`. Reason codes and pairings are defined in the [data model](../../specs/002-shop-advisor/data-model.md). The server rejects malformed, unsupported, unaffordable, capped, or stale choices before display, and creates explanation text from trusted facts. No model text is interpreted as a game command.

## Failure policy

The [Gemini Hint Changes V2 plan](GEMINI_HINT_CHANGES_V2.md) owns deadlines, retry classification, telemetry, and the three-model fallback order. All terminal and exhausted paths show an unavailable state with no purchase recommendation. A model refusal, invalid output, or policy/permission failure cannot be routed to another model to evade it. Public responses contain no raw provider error, prompt, credential, private telemetry, or stack trace.
