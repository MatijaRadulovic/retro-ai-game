# Data Model: Secure Agent Boundaries

All entities are process-local unless stated otherwise. Public DTOs never include internal scope, cookie, verifier hash, leases, raw provider content or secrets.

## SessionRecord

| Field | Type / bounds | Rule |
|---|---|---|
| `tokenHash` | fixed-length digest | Map key; raw cookie token is never stored |
| `scopeId` | random internal identifier | Never serialized, logged or sent model/tool |
| `requestVerifier` | random opaque value | Returned only at bootstrap; compared in constant-time where practical |
| `createdAt`, `lastSeenAt` | monotonic milliseconds | Authorized browser activity updates `lastSeenAt`; server tick does not |
| `idleExpiresAt`, `absoluteExpiresAt` | timestamps | Expire after 30 min idle or 8 h absolute, whichever comes first |
| `gameIds` | set, max 3 | Every game has exactly one owner scope |
| `subscriptions` | integer 0..3 | Also bounded globally |
| `activeAgentRuns` | 0..1 | Shared across games in scope |
| `acceptedRunTimes` | sorted queue, max 5 live entries | Rolling 60 s window |

The opaque HttpOnly cookie resolves to the server-side `SessionRecord`; per-session run/game/subscription limits are keyed by that record's internal `scopeId`, never by a client-provided user ID. This is an anonymous browser-session approximation of “per user,” not a verified person identity. `SessionStore` process bounds are at most 100 active records and at most 20 successful issuances in a rolling 60-second window. It prunes expired records before checking capacity. The creation-time queue is bounded to 20 live timestamps; rejected attempts do not consume timestamps. These global limits backstop cookie deletion/new scopes.

State: `active → idle → expired → destroyed`. Expiry aborts/pins cleanup safely and deletes owned games after active leases settle.

## OwnedGameSession

Extends the existing private `Session` record with:

| Field | Rule |
|---|---|
| `ownerScopeId` | Immutable internal owner; absent from `GameSnapshot` |
| `lastAuthorizedActivityAt` | Updated by valid browser actions/subscription, not game tick; expire after 30 min without authorized browser activity |
| `pinCount` | Prevents expiry during active authorized agent work |
| `subscriptionCount` | 0 or 1; at most one WebSocket subscription per game |
| Existing state/revision/history/timer/listeners | Preserve current server-authoritative behavior |

## RequestContext

Immutable result of admission parsing:

- `correlationId`: server-generated UUID for events, not an access token.
- `scopeId`: internal authorized scope.
- `operation`: allowlisted route/action enum.
- `originClass`: `allowed_browser | non_browser_internal` as explicitly configured; never trust arbitrary Origin as identity.
- `receivedAt`: injected clock.

The raw cookie/verifier do not survive into business or agent context.

## ResourceGovernor

Process state:

- `activeAgentRuns`: 0..2.
- `acceptedRunTimes`: rolling queue, at most 20 live entries.
- `games`: 0..100.
- `subscriptions`: 0..100, with at most one subscription per game.
- Per-scope budget references.

`tryAcquireRun(scope, now)` atomically prunes both windows, verifies session/global rate and active caps, appends timestamps, increments counters and returns a `RunLease`. Rejection changes no counters/timestamps.

## Lease

| Field | Rule |
|---|---|
| `kind` | `run | game | subscription | pin` |
| `released` | Private boolean; starts false |
| `release()` | First call decrements exact counters; later calls are no-op |

Run lease release condition: orchestration is sealed and every raw provider promise started by that run has settled.

## AuthorizedAgentRun

Existing AgentRun plus:

- immutable `scopeId` and `correlationId`;
- acquired `RunLease` and game pin;
- pending provider promise tracker;
- normalized transcript only;
- no cookie, verifier, game ID in model content, or raw tool object.

## NormalizedToolResult

Discriminated union keyed by existing tool name. Each parser reconstructs a fresh exact-field DTO:

- `ShopStateResult`: bounded numeric shop facts.
- `PlanEvaluationResult`: structured steps/failure/effect codes without free-form text.
- `RecentRunsResult`: at most five bounded run summaries.

Raw tool output is discarded after parsing and raw/normalized size checks.

## EvidenceReference

```text
{ source: ToolName, step: positive integer, fact: SourceSpecificFactCode }
```

Allowed fact codes depend on `source`, for example:

- `get_shop_state`: `perk_points`, `extra_xp_state`, `luck_state`, `extra_life_state`.
- `evaluate_perk_plan`: `plan_valid`, `plan_total_cost`, `points_left`.
- `get_recent_runs`: `run_count`, `latest_run_score`, `latest_run_level`, `latest_run_end`.

Resolver verifies the cited normalized result contains the fact and builds player-facing text from its trusted value.

## SecurityEvent

Closed union with exact fields:

- common: `event`, `timestamp`, `correlationId`, `operation`, `outcome`, `reasonCode`;
- optional bounded counters: `providerAttempts`, `toolCalls`, `activeRuns`, `latencyMs`, provider status;
- optional known enum: model or allowed tool; unknown names become `unknown` or are omitted.

Forbidden: raw input, game/scope/session identifiers, cookie/verifier, prompt, provider/tool payload, complete state, stack, chain-of-thought, secret.

## Persistence and reset

Process restart clears every entity above, current game/history and event continuity. The Gemini key is not an entity and is never persisted; it remains only in server runtime configuration.
