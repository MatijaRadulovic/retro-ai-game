# Tool Contracts — AI Plan to Next Life

The backend owns the allowlist. The model can name a tool only in its proposal; it cannot invoke one. At most one tool proposal may be returned per model step. The application validates exact schema, current phase, scope, budget, duplicate signature and cancellation before execution.

## `get_shop_context`

| Field | Contract |
|---|---|
| Purpose | Return the single sanitized shop context captured for the start of this run. |
| Mode | Read-only, deterministic local lookup. |
| Input | Exactly `{}`; reject all extra keys. |
| Output | Exact `ShopContext` from [data-model.md](../data-model.md); no game ID/revision, full GameState, snake, board, coordinates, other games, secrets or private data. |
| Phase | `context` only; successful execution moves the app to `evaluate_first`. |
| Authorization | Backend run's game must still exist, remain paused and have the starting revision. |
| Limits | One execution per run, max 8 KiB serialized output, max 100 ms. |
| Failure | Stop as stale or `invalid_tool_result`; do not pass invalid output to model. |
| Must not | Read files/network, mutate game/revision/RNG/timers, or accept model-supplied state. |

## `evaluate_plan`

| Field | Contract |
|---|---|
| Purpose | Project one allowed saving strategy against the next actual +1 Life cost. |
| Mode | Pure deterministic local computation; read-only. |
| Input | Exactly `{strategy, foodLimit}`; strategy is one enum and `foodLimit` is exactly `100`. No additional keys. |
| Output | Exact discriminated `PlanEvaluation`; server generates evidence ID and all derived values. |
| Phase | `evaluate_first` permits the application-approved first available strategy; `evaluate_second` permits only the other strategy if available and not previously evaluated. |
| Authorization | All values derive from the immutable run context. The model cannot supply XP, points, costs, formula, state, ID or revision. |
| Limits | At most two executions per normal run (one if Extra XP unavailable), max 8 KiB result, max 100 ms, at most 100 projection iterations. |
| Failure | Invalid arguments execute zero calls; invalid output stops safely; no strategy result is treated as proof unless validated. |
| Must not | Call provider/network/filesystem, mutate the game, consume RNG, alter timers/revision, claim guaranteed real play, or include future Lucky rewards. |

## Validation and recovery policy

1. Decode exact one-of `tool_request`/`final` envelope.
2. Require the proposal kind/name/arguments to match the current app-owned phase.
3. Validate input, starting revision/status, allowed strategy and remaining step/tool/provider/time budgets.
4. Reject a duplicate `toolName + canonicalArgs + startRevision` signature before execution.
5. Execute only the concrete function from the static registry.
6. Validate exact output variant, safe integer values, projection math, assumptions, size and evidence-ID uniqueness before returning output to the model.
7. App decides next phase, retry/fallback eligibility and terminal stop; model cannot direct any of these.

Every rejected proposal has zero execution count for that proposal. Invalid deterministic tool output is not retried or sent to the provider as trusted evidence. Eligible provider transport failures follow feature 002's classification/Google ordering but share the W05 run-wide six-attempt and 60-second limits.
