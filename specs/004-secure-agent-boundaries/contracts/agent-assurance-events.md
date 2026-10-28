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

Event kinds:

- `request_admission`
- `access_denied`
- `limit_denied`
- `tool_rejected`
- `provider_attempt`
- `run_completed`

Illustrative redacted record:

```json
{
  "event": "tool_rejected",
  "timestamp": "2026-10-28T10:30:00.000Z",
  "correlationId": "w08-generated-7f31",
  "operation": "shop_agent",
  "outcome": "denied",
  "reasonCode": "TOOL_NOT_ALLOWED",
  "providerAttempts": 1,
  "toolCalls": 0
}
```

All event objects are constructed from enums/bounded numbers and validated before one `JSON.stringify` write. Unknown tool input is recorded only as `unknown` or omitted. Raw attacker text cannot create a field or newline.

## Event minimization

Never record game ID, scope/session ID, cookie/verifier, goal/prompt, tool args/result, provider response, shop values, stack trace, chain-of-thought, key or arbitrary error text. Detailed internal step logs may exist in test memory but are not the operational event payload.

## Prompt-injection proof boundary

The product has a fixed goal and no genuine user free-text prompt. The mandatory fake-provider test therefore proves that execution policy rejects a forbidden proposal after malicious data, not that a live model can never follow prompt injection.
