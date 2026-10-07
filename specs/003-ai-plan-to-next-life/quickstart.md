# Quickstart — AI Plan to Next Life

This is the planned verification guide. It becomes runnable after the feature is implemented. The feature is tested offline with fake model steps; no key or live provider is required.

## Prerequisites

- Node.js 22 or newer and repository dependencies installed.
- Start from a cleanly recorded working-tree state; preserve user changes.
- Do not open or read secret files. No `GEMINI_API_KEY` is needed for automated checks.

## Automated gates

```sh
npm run typecheck
npm test
npm run build
npm run security:scan
```

Expected: all commands exit 0; existing tests pass; W05 tests use injected fake provider, controlled time and deterministic game snapshots; no network/provider call occurs.

## Focused scenarios

1. Run the pure evaluator tests for level thresholds, multiple level-ups in one award, life costs 5/8, Extra XP effect, equal results, exactly 100 food, and not reached within limit.
2. Run orchestrator tests for success (4 model steps/3 tool calls), Extra XP unavailable (3/2), invalid tool/result/final, unknown phase, repeat signature and evidence binding.
3. Run provider-policy tests for terminal errors, allowed transient retry/fallback, six attempts across all steps, ten-second attempt timeout, 30-second deadline, cancellation and cleanup.
4. Run API tests for exact empty body, missing/not-paused game, already-affordable direct response, life cap, cross-action busy, stale revision and zero calls on preflight rejections.
5. Compare before/after game snapshot, revision, RNG-call counter and timer behavior for every successful or failed analysis; verify existing ASK SHOP AI cases unchanged.
6. Run the fake-server browser E2E. Confirm the button exists only while the shop UI is open, both AI buttons share busy state, progress text is generic, and stale output is discarded.

Frozen expectations and baseline are in [Evidence 014](../../docs/tracking/evidence/EVIDENCE_014.md); IDs W05-01–W05-25 must not change during an implementation comparison.

## Manual demonstration after implementation

Use a local fake provider first. Demonstrate:

- normal save-vs-Extra-XP run with four proposals/steps, three actual tool executions and validated evidence;
- an unknown tool or malformed arguments rejected with zero executions;
- a malformed tool result or contradictory final rejected, with safe status and stop reason;
- deadline/provider failure and cleanup;
- no game-state change and existing ASK SHOP AI still works.

Any live-provider smoke test is separate and requires explicit authorization. Do not record credentials, raw prompts/responses, game IDs or chain-of-thought.
