# Model Step Contract — AI Plan to Next Life

The provider adapter returns one normalized untrusted value for one application-issued step. Provider-specific SDK/HTTP details stay behind the adapter. Only the approved server-side Google model list from feature 002 may be selected by server policy.

## Request

Application creates a request from the fixed system instruction, fixed goal, current phase, minimal sanitized context, already validated normalized tool results and exact allowed next proposal schemas. It excludes game ID, revision, other sessions, board/snake coordinates, secrets, source code, raw telemetry and user-authored instructions. The application increments one `agentSteps` counter per logical model decision; retries increment only `providerAttempts`.

## Response envelope

```ts
type ModelStepResponse =
  | { kind: "tool_request"; name: "get_shop_context" | "evaluate_plan"; arguments: unknown }
  | { kind: "final"; result: {
      recommendation: "save_for_life" | "buy_extra_xp_then_save" | "no_recommendation";
      reasonCode: "fewer_food" | "tie_save" | "only_save_reached"
        | "only_extra_xp_reached" | "extra_xp_unavailable" | "none_reached";
      evidenceIds: string[];
    } };
```

Exactly one variant and exact keys are required. Which variant and tool names are permitted is determined by backend phase, not the model. Refusal, empty output, invalid JSON/schema, output size overflow and semantic mismatch are classified separately as appropriate. Invalid model messages never execute a tool.

## Application authority

- The model proposes; the application parses, validates, authorizes and alone executes.
- The application sends only the currently allowed next-step schema; this is guidance, not an authorization bypass.
- The application owns retries, fallback, continuation, final strategy, result wording, terminal state and stop reason.
- A final proposal is accepted only if the referenced IDs are current-run evaluations and the proposal matches their values. Backend recomputes the winner and tie-break; contradictions are terminal invalid finals.
- No model-proposed stop, additional tool, arbitrary argument, changed limit or completion claim can override run policy.

## Time and failures

Each attempt uses the lesser of 10 seconds and the remaining 60-second run deadline. At most six provider attempts are allowed across the complete run and all approved fallback models. Feature 002 retry classifications and per-model limits remain in force; apply whichever overlapping cap is stricter. A successful fallback model becomes the starting model for later steps of the same run; eligible failures may advance to later approved models. Authentication/configuration errors, refusal, invalid output, cancellation and malformed requests are terminal. No new model attempt begins after the run reaches a terminal state or deadline.
