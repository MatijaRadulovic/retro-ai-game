# Contract: Session, Ownership and Request Admission

## Bootstrap

`POST /api/session`

- Required media type: `application/json` (charset parameter allowed by documented parser policy).
- Body: exactly `{}`; max request body remains 16 KiB.
- Browser Origin must equal the configured local client origin. No wildcard/reflected CORS access.
- Success: `201`, `Cache-Control: no-store`, an opaque HttpOnly/SameSite session cookie, and body:

```json
{ "requestVerifier": "opaque-base64url-value", "expiresInSeconds": 28800 }
```

The verifier is held in `sessionStorage` for the current tab: it survives a reload in that tab and is cleared when that tab is closed. It is never placed in `localStorage`, URLs, model/tool context, logs, or snapshots. The session cookie remains `HttpOnly` and is sent by the browser; JavaScript cannot read it.

Admission is process-wide: at most 100 active session records and at most 20 successful new session issuances in the rolling interval `(now - 60_000, now]`. Expired records and timestamps outside the interval are pruned before admission; failed attempts do not consume a timestamp. This is a resource-abuse backstop, not a per-person quota or identity guarantee.

During its lifetime, the HttpOnly cookie resolves to one server-side scope. Per-scope rates and quotas (including 5 agent starts/60 seconds, one active run, three games and three subscriptions) apply to that scope across all its game IDs. The planned session lifetime is 30 minutes idle / 8 hours absolute. This gives per-anonymous-session limits, not verified per-human limits; resetting/deleting the cookie creates a new scope subject to process-wide issuance and capacity limits.

## Protected HTTP requests

Every `/api/games...` operation requires:

- valid unexpired session cookie;
- `X-Retro-Request` verifier;
- allowed Origin for browser unsafe methods;
- documented media type/body for POST;
- ownership of `:gameId` before protected read/mutation/provider/tool work.

Game creation associates the new game with the request scope. `gameId` alone is never authorization.

## WebSocket

`GET /api/games/:gameId/events` upgrade requires:

- allowed exact Origin;
- valid session cookie and game ownership;
- public protocol plus verifier-bearing subprotocol offer, without a URL query token;
- available per-game, per-session and process subscription capacity.

Admission occurs before `handleUpgrade` and `subscribe`. At most one subscription is admitted per game, three per session scope, and 100 process-wide. Lease release is idempotent on upgrade failure, close, error and shutdown.

## Public failure policy

| Condition | Status | Stable code | Provider/tool work |
|---|---:|---|---:|
| Missing/malformed session | 401 | `session_required` | 0 / 0 |
| Expired session | 401 | `session_expired` | 0 / 0 |
| Origin/verifier mismatch | 403 | `request_forbidden` | 0 / 0 |
| Foreign or nonexistent private game | 404 | `game_not_found` | 0 / 0 |
| Wrong media type | 415 | `unsupported_media_type` | 0 / 0 |
| Body > limit | 413 | `payload_too_large` | 0 / 0 |
| Invalid JSON/schema | 400 | `invalid_request` | 0 / 0 |
| Session active-run conflict | 409 | `agent_busy` | 0 / 0 |
| Session/global rate window | 429 | `agent_rate_limited` | 0 / 0 |
| Process run capacity | 503 | `agent_capacity_exhausted` | 0 / 0 |
| Session creation rate | 429 | `session_rate_limited` | 0 / 0 |
| Session record capacity | 503 | `session_capacity_exhausted` | 0 / 0 |
| Session game cap | 409 | `game_limit_reached` | 0 / 0 |
| Process game/subscription capacity | 503 | `capacity_exhausted` | 0 / 0 |

Rate response includes bounded `Retry-After`. Public messages remain generic. Exact internal reason is an allowlisted security-event enum.

## No-login limitation

This contract separates temporary browser scopes; it does not identify a person. A new cookie can create a new scope, so process-wide rate/capacity limits are mandatory. Public/multi-process use is outside this contract.
