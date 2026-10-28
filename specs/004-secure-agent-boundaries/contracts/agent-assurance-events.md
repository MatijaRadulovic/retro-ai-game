# Contract: Agent Assurance and Security Events

## Tool proposal and result

- Tool name remains exactly one of `get_shop_state`, `evaluate_perk_plan`, `get_recent_runs`.
- Unknown/inherited/write/network/file/shell names stop without execution.
- Arguments use exact source-specific schemas.
- Execution receives an already-authorized immutable scope and current snapshot/history.
- Raw result is checked for serialized size, parsed into a fresh normalized DTO, checked again for size, and only that DTO enters transcript.
- Additional fields, invalid values, getters/prototype surprises, free-form effect text and synthetic secret fields fail closed.

## Final result

Planned model envelope:

```json
{
  "kind": "final",
  "result": {
    "summaryCode": "buy_evaluated_plan",
    "plan": ["extra_xp"],
    "evidence": [
      { "source": "evaluate_perk_plan", "step": 2, "fact": "plan_total_cost" }
    ],
    "confidence": "medium",
    "completed": true
  }
}
```

Rules:

1. Exact fields and bounds; no free-form factual sentence is trusted.
2. Every source/step exists in the normalized transcript.
3. Fact code is allowed for that source and its value exists in the cited result.
4. Non-empty plan exactly equals a same-run evaluator-valid plan.
5. Empty plan has application-verifiable unaffordable/all-capped facts.
6. Status/revision/ownership remain current.
7. Application generates public plan/evidence wording from trusted values.

## Security event union

Every HTTP/agent/WebSocket denial and every agent telemetry event uses `event: "w08_security_event"` and a `kind` discriminator:

- `request_denied`: operation, safe reason, HTTP status, and zero counters (or `null` if work count is not knowable).
- `provider_attempt`: allowlisted model, outcome/reason, step/attempt, cumulative provider/tool counters, latency, and optional HTTP status.
- `tool_rejected`: allowlisted rejection reason, allowlisted tool name or `unknown`, step, cumulative provider/tool counters.
- `agent_run_finished`: outcome, stop reason, bounded steps/provider/tool counters, elapsed time.

Illustrative redacted record:

```json
{"event":"w08_security_event","kind":"tool_rejected","outcome":"denied","correlationId":"123e4567-e89b-42d3-a456-426614174000","operation":"shop_agent","reason":"unknown_tool","tool":"unknown","step":2,"providerAttempts":1,"toolCalls":0}
```

All event objects are constructed from enums/bounded numbers and validated before one `JSON.stringify` write. Agent events carry the originating HTTP correlation ID; HTTP and WebSocket denials receive an application-generated correlation ID. Unknown tool input is recorded only as `unknown` or omitted. Raw attacker text cannot create a field or newline. Counters are cumulative within the current run/request and capped by fixed W08 limits; they are not durable aggregate analytics.

## Event minimization

Never record game ID, scope/session ID, cookie/verifier, goal/prompt, tool args/result, provider response, shop values, stack trace, chain-of-thought, key or arbitrary error text. Detailed internal step logs may exist in test memory but are not the operational event payload.

## Prompt-injection proof boundary

The product has a fixed goal and no genuine user free-text prompt. The mandatory fake-provider test therefore proves that execution policy rejects a forbidden proposal after malicious data, not that a live model can never follow prompt injection.
