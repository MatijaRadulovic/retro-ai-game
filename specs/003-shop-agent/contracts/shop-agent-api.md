# Shop Agent HTTP Contract

## Route

`POST /api/games/:gameId/shop-agent`

- Body: exactly `{"goal":"plan_next_purchases"}`. No model, prompt, tool, limit or context fields.
- Game must exist (404 `game_not_found`) and be paused (409 `invalid_status`). Non-object body, extra fields or unknown goal: 400 `invalid_request`.
- One active run per game. An overlap returns the safe `busy` result without a provider call.
- A closed browser connection aborts the run (`cancelled`).
- No game revision is published by this route.

## Response (HTTP 200)

Completed:

```json
{
  "run": {
    "runId": "6f1c…",
    "status": "completed",
    "revision": 12,
    "steps": 3,
    "toolCalls": 2,
    "result": {
      "summary": "You can afford Extra XP twice; save the rest.",
      "plan": ["extra_xp", "extra_xp"],
      "evidence": [{ "source": "get_shop_state", "step": 1, "finding": "4 points, Extra XP level 1." }],
      "confidence": "medium",
      "completed": true
    },
    "message": "PLAN: EXTRA XP → EXTRA XP · COST 3 PT · 0 PT LEFT."
  }
}
```

The completed `message` is the server-built plan line from the validated plan and its evaluation (never model prose).

Stopped or failed (never contains `result`):

```json
{
  "run": {
    "runId": "6f1c…",
    "status": "stopped",
    "revision": 12,
    "steps": 2,
    "toolCalls": 0,
    "stopReason": "unknown_tool",
    "message": "ANALYSIS COULD NOT BE COMPLETED SAFELY. NO PURCHASE WAS MADE."
  }
}
```

`status` ∈ `completed|stopped|failed`; `stopReason` ∈ the list in [agent-flow.md](../agent-flow.md). `busy` and `not_configured` are returned as `status: "failed"` with `stopReason: "provider_failed"` and the same safe message. The client validates exact keys and ignores a result whose revision differs from its snapshot or whose shop is closed. The UI shows "AI ANALYSIS IN PROGRESS…" while waiting.

Responses never contain raw provider errors, prompts, credentials, stack traces, tool arguments, or game IDs.
