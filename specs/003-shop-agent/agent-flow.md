# Agent Flow, Limits and Stop Conditions

## Flow

```
Player presses ASK STRATEGIST (shop open, game paused)
   ↓
POST /api/games/:id/shop-agent {"goal":"plan_next_purchases"}
   ↓
Preflight: game exists · paused · exact body · no active run · key configured     → reject, 0 provider calls
   ↓
Create AgentRun (status running, stateVersion = revision, deadline = now + totalDeadlineMs)
   ↓
┌─ loop while status = running ───────────────────────────────────────────────────┐
│ Budget check: steps < maxAgentSteps · deadline not passed · attempts left      │
│   ↓                                                                            │
│ Model step (gateway; retry/fallback inside shared attempt budget)              │
│   ↓                                                                            │
│ Parse + schema check envelope                           → invalid → stop       │
│   ├─ kind = tool_request                                                       │
│   │     allowlist? args valid? toolCalls < max? evaluator cap? repeat key new? │
│   │     any "no" → stop (tool NOT executed, toolCallCount unchanged)           │
│   │     execute tool (timeout) → validate result (shape, size, secrets)        │
│   │     invalid → stop tool_failed; valid → append to run context              │
│   └─ kind = final                                                              │
│         ≥1 tool executed? plan evaluated valid? evidence real? length ok?      │
│         no → stop invalid_model_proposal; yes → revision still current?        │
│         no → stop stale; yes → completed                                       │
└────────────────────────────────────────────────────────────────────────────────┘
   ↓
Safe response: status + validated result or stop category + safe message
```

Layer 3 (revise) needs no extra code path: the model may call `evaluate_perk_plan` a second time with a *different* plan after seeing failures. Same plan → `repeated_action`. A third evaluator call → refused.

## Limits (single config object, tested)

| Name | Value | Meaning |
|---|---|---|
| `maxAgentSteps` | 5 | model decisions per run (typical run uses 3) |
| `maxToolCalls` | 4 | executed tools per run |
| `maxEvaluatorCalls` | 2 | `evaluate_perk_plan` executions (first plan + one revision) |
| `maxAttemptsPerStep` | 2 | provider attempts for one step |
| `maxProviderAttempts` | 8 | provider attempts per whole run |
| `maxProviderFallbacks` | 2 | model switches per run |
| `perCallTimeoutMs` | 10 000 | one provider call (matches W04) |
| `totalDeadlineMs` | 45 000 | whole run including backoff |
| `toolTimeoutMs` | 200 | one tool execution |
| `maxToolResultBytes` | 4 096 | serialized tool result |
| `maxSummaryChars` / `maxFindingChars` | 200 / 160 | final text bounds |
| `maxPlanLength` | 3 | purchases in a plan |

`maxToolCalls` is 4 (not 3) because the full layered flow is `get_shop_state`, `get_recent_runs`, `evaluate_perk_plan`, and one revised `evaluate_perk_plan`.

Backoff between transient failures reuses the W04 jitter style (1 s, 3 s, ...), bounded by the remaining deadline. `Retry-After` longer than the remaining deadline skips that model.

## Counters

- `stepCount` +1 when a model returns any decision (valid or not).
- `toolCallCount` +1 only when a tool actually starts executing.
- `evaluatorCallCount` +1 when `evaluate_perk_plan` starts executing.
- `providerAttempts` +1 per HTTP call; per-step attempts reset on a new step.

## Stop conditions (orchestrator-owned)

| Stop reason | Trigger | Tool executed? | User-facing text |
|---|---|---|---|
| `completed` | validated final | n/a | Server-built plan line, e.g. PLAN: EXTRA XP → LUCK · COST 4 PT · 1 PT LEFT. |
| `invalid_model_proposal` | bad envelope, premature/invalid final | no | Analysis could not be completed safely. |
| `unknown_tool` | tool not in allowlist | no | same |
| `invalid_tool_arguments` | schema/bounds violation | no | same |
| `tool_failed` | tool error/timeout/invalid result | partial | same |
| `provider_failed` | non-retryable provider error, exhausted attempts/fallbacks, missing key | n/a | same |
| `step_limit` | step budget reached without final | n/a | same |
| `tool_call_limit` | tool or evaluator budget reached | no | same |
| `deadline` | total deadline reached | n/a | same |
| `repeated_action` | repeat key seen before | no | same |
| `cancelled` | client connection closed | n/a | (none, client gone) |
| `stale` | revision changed or game no longer paused | n/a | Analysis result is out of date. |

Status mapping: `completed` → run status `completed`; `cancelled`, `stale`, `step_limit`, `tool_call_limit`, `deadline`, `repeated_action`, `unknown_tool`, `invalid_tool_arguments`, `invalid_model_proposal` → `stopped`; `provider_failed`, `tool_failed` → `failed`.

## Context discipline (what the model sees)

System instruction (server constant) + the goal enum + tool descriptors (allowlist) + the validated results of this run's tool calls + remaining budget numbers. Never: board, snake, food coordinates, game ID, other games, secrets, source code, previous runs' raw logs.
