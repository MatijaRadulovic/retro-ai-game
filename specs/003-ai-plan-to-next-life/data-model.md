# Data Model — AI Plan to Next Life

All objects below are runtime-validated. Model proposals are untrusted. `runId`, `evidenceId`, game ID and revision are generated/held by the backend; IDs never grant model authority.

## AgentRun

```ts
type RunStatus = "created" | "running" | "completed" | "incomplete" | "unavailable" | "stale" | "cancelled" | "failed";
type RunPhase = "context" | "evaluate_first" | "evaluate_second" | "final" | "terminal";
type StopReason =
  | "completed" | "incomplete" | "life_cap" | "already_affordable"
  | "invalid_proposal" | "unknown_tool" | "invalid_arguments" | "wrong_phase"
  | "repeated_action" | "invalid_tool_result" | "invalid_final" | "provider_terminal"
  | "provider_exhausted" | "step_limit" | "tool_call_limit" | "provider_attempt_limit"
  | "deadline" | "stale_revision" | "cancelled" | "internal_error";

type AgentRun = {
  runId: string;              // anonymous, server-generated
  gameId: string;             // backend-only; never sent to provider or telemetry
  startRevision: number;      // backend-only; never sent to provider
  status: RunStatus;
  phase: RunPhase;            // application-controlled
  goal: "plan_to_next_life";
  context?: ShopContext;      // immutable sanitized snapshot data
  evaluations: PlanEvaluation[];
  executedSignatures: string[];
  agentSteps: number;         // increments once per model decision request
  providerAttempts: number;   // increments for every provider attempt across run
  toolCalls: number;          // increments only after a tool actually executes
  startedAt: number;
  deadlineAt: number;
  stopReason?: StopReason;
};
```

`AgentRun` is process-local and exists only until one request terminates. It is not persisted. Terminal status/stop reason is set by application policy; the model cannot set them.

## ShopContext (provider-minimal)

```ts
type ShopContext = {
  xp: number;
  level: number;
  perkPoints: number;
  extraXp: { level: number; nextCost: number | null; xpPerRedFood: number };
  extraLife: { charges: 0 | 1 | 2; nextCost: 5 | 8 | null };
};
```

Derived from one validated paused snapshot. Excludes game ID, revision, score if unused, snake, board, food coordinates, Lucky pickup coordinates, other games, source, environment and credentials. Server retains revision separately for staleness checks.

## Proposal and StepEnvelope

```ts
type Strategy = "save_for_life" | "buy_extra_xp_then_save";
type ToolName = "get_shop_context" | "evaluate_plan";
type ToolProposal = { kind: "tool_request"; name: ToolName; arguments: unknown };
type ModelFinalProposal = {
  kind: "final";
  result: {
    recommendation: Strategy | "no_recommendation";
    reasonCode: "fewer_food" | "tie_save" | "only_save_reached"
      | "only_extra_xp_reached" | "extra_xp_unavailable" | "none_reached";
    evidenceIds: string[];
  };
};
type StepEnvelope = ToolProposal | ModelFinalProposal;
```

Exact key sets; one proposal only. The allowed `kind` and tool names change by application phase. There is no `complete`, `continue`, `maxSteps`, arbitrary provider, URL, user text or game action field.

## Tool inputs and outputs

```ts
type GetShopContextInput = Record<string, never>;
type EvaluatePlanInput = { strategy: Strategy; foodLimit: 100 };

type ProjectionBase = {
  evidenceId: string; strategy: Strategy; foodLimit: 100;
  purchaseCostNow: number; pointsAfterPurchase: number; xpPerRedFood: number;
  projectedXp: number; projectedLevel: number; projectedPoints: number;
  assumptions: readonly ["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"];
};
type PlanEvaluation =
  | (ProjectionBase & { status: "reached"; foodsToGoal: number })
  | (ProjectionBase & { status: "not_reached_within_limit" })
  | { evidenceId: string; strategy: "buy_extra_xp_then_save"; status: "unavailable";
      reasonCode: "extra_xp_capped" | "insufficient_points"; foodLimit: 100 };
```

For strategy A, `purchaseCostNow=0` and `pointsAfterPurchase` equals initial points. For B, cost is the actual next Extra XP price and its hypothetical deduction is local only. `foodsToGoal` exists only on `reached`. The evaluator simulates 1–100 red foods and grants one point per crossed level, including multiple thresholds from one award. Future Lucky points are excluded.

Each tool result serializes to at most 8 KiB and completes within the 100 ms budget. Tool arguments never carry XP, points, prices, formulas, state, run/game ID or revision. Result validation checks safe integers/ranges, projection consistency, strategy/effect pairing, assumption IDs, status-specific keys and size.

## Evidence record

Each successful evaluation produces a random run-scoped `evidenceId` linked internally to one validated result. It contains no game identifier. Repeated IDs, IDs from another run, IDs referring to the wrong strategy, and IDs unsupported by the current phase are rejected.

## PublicLifePlanResult

```ts
type PublicLifePlanResult =
  | { status: "completed"; revision: number; source: "application" | "validated_plan";
      recommendation: Strategy | "buy_now"; reasonCode: string; evidenceIds: string[];
      comparison?: Array<{ strategy: Strategy; status: "reached" | "not_reached_within_limit";
        foodsToGoal?: number; projectedPoints: number }>;
      assumptions: string[]; message: string }
  | { status: "incomplete"; revision: number; reasonCode: "none_reached";
      comparison: PlanEvaluation[]; assumptions: string[]; message: string }
  | { status: "unavailable" | "stale" | "cancelled"; revision: number;
      code: string; message: string };
```

Exact-key runtime validation applies. Message, food counts and comparison values are assembled from backend-validated facts. Direct “buy now” and life-cap paths do not call the provider. Raw model/tool content, internal run ID, game ID, stack traces and chain-of-thought are excluded.

## State transitions

```text
created → running(context)
  → running(evaluate_first)
  → running(evaluate_second)  # only if strategy B is available
  → running(final)
  → completed | incomplete

Any running phase → unavailable | stale | cancelled | failed
Terminal status → no outgoing transition
```

Only backend code advances phase. Every phase transition checks the expected previous state and current revision. Provider retries happen inside one model step and consume the run-wide provider budget; they do not advance the phase or agent-step count. Tool failures do not trigger an implicit replay of earlier successful tools.
