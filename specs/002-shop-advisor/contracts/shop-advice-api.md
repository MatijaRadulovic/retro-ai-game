# Shop Advice HTTP and Provider Contract

## Public route

`POST /api/games/:gameId/shop-advice`

- Request content type: JSON.
- Body: exactly `{}`; no model, context, prompt, or action fields.
- The game must exist and be paused. The browser exposes the control only while the shop is visible.
- Only one advice request per game may be in flight; an overlap returns a safe busy result without a provider call.
- A dropped browser connection aborts pending provider work.

### Success

HTTP 200:

```json
{
  "advice": {
    "status": "advice",
    "revision": 12,
    "decision": "buy_extra_xp",
    "reasonCode": "faster_xp",
    "message": "BUY EXTRA XP FOR 2 POINTS. EACH FOOD WILL GRANT 2 MORE XP.",
    "model": "gemini-3.8-flash"
  }
}
```

`decision` is one of `buy_extra_xp`, `buy_luck`, `buy_extra_life`, or `wait`. `model` is exactly `gemini-3.8-flash`, `gemini-3.5-flash-lite`, or `gemma-4-26b-a4b-it`. Text is server-generated, not raw model prose. The response has no executable purchase command.

### Unavailable

HTTP 200:

```json
{
  "advice": {
    "status": "unavailable",
    "revision": 12,
    "code": "temporarily_unavailable",
    "message": "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."
  }
}
```

Use stable codes `not_configured`, `busy`, `cancelled`, `stale`, `invalid_provider_output`, or `temporarily_unavailable`. An unavailable result must never contain `decision` or `model`. The client validates exact keys and ignores a result whose revision differs from its current snapshot or whose shop is closed.

### Rejected request

- 400 `invalid_request`: non-object body or extra fields.
- 404 `game_not_found`: unknown game ID.
- 409 `invalid_status`: existing game is not paused.

Responses use the existing `{error:{code,message}}` envelope and never include raw upstream details. No game revision is published by this route.

## Gemini structured-output request

Server-only `POST https://generativelanguage.googleapis.com/v1beta/models/{allowlistedModel}:generateContent` with `x-goog-api-key` header and JSON body:

```json
{
  "systemInstruction": {"parts": [{"text": "<reviewed shop instruction>"}]},
  "contents": [{"role": "user", "parts": [{"text": "<serialized minimal shop context>"}]}],
  "generationConfig": {
    "responseFormat": {
      "text": {
        "mimeType": "APPLICATION_JSON",
        "schema": {
          "type": "object",
          "properties": {
            "decision": {"type": "string", "enum": ["buy_extra_xp", "buy_luck", "buy_extra_life", "wait"]},
            "reasonCode": {"type": "string", "enum": ["faster_xp", "more_lucky", "collision_protection", "save_points", "cannot_afford", "all_capped"]}
          },
          "required": ["decision", "reasonCode"],
          "additionalProperties": false
        }
      }
    }
  }
}
```

Google's structured-output support is a generation aid. Parse and validate the returned candidate's text independently. Reject no candidate, refusal/blocked finish, extra keys, unknown enum, invalid pairing, unaffordable or capped purchase, and stale session. Never execute a model-proposed tool or game action.

## Gemma 4 text-JSON request

The final fallback uses the same server-only endpoint and key with model `gemma-4-26b-a4b-it`, but has a separate capability branch. It sends the reviewed system instruction plus an explicit exact-JSON instruction, the same minimal shop context, and a 128-token output cap. It does not send the Gemini structured-output `responseFormat`. The response text must parse as JSON and pass the same exact schema and semantic validation.

## Internal attempt telemetry

The production server writes one single-line JSON event per attempt. Allowed fields are the anonymous logical interaction ID, operation/phase, provider/model/adapter, ordered attempt details, safe status/error class, provider HTTP status, latency, fallback/congestion flags, explicit cache status (`not_used`), and normalized token usage. Raw prompt/response data, request headers, credentials, game/session IDs, and shop values are forbidden.

## Attempt policy

Overall 85 seconds; max 10 seconds per call; Flash once, Flash-Lite at most twice, and Gemma at most three times. Base delays after successive transient failures are 1, 3, 5, 5, then 5 seconds with bounded jitter. A `Retry-After` of at most 5 seconds is honored when it fits the remaining deadline; a longer value skips remaining attempts for that model rather than retrying early. A confirmed model `404` also skips to the next allowlisted capability branch without retrying. Two consecutive transient Flash failures across requests open a process-local 15-minute congestion marker. Invalid output, refusal, auth/permission/configuration errors, cancellation, and bad requests terminate. Exhaustion returns unavailable, with no AI recommendation.
