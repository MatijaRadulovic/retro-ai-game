# Implementation Plan: AI Plan to Next Life

**Branch**: `003-ai-plan-to-next-life` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

**Input**: User-approved feature spec; original prompt v1 is preserved at [BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt](../../docs/prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt). The latest user direction adds Spec Kit planning and the explicit application-authority requirement.

## Summary

Add a separate paused-shop action that uses a bounded four-step workflow to collect a single sanitized shop snapshot, evaluate the save and one-Extra-XP strategies with a deterministic local function, and return an application-verified comparison. The model may propose one next tool and later submit evidence references; the backend validates each proposal and result, executes only its phase allowlist, calculates the final winner itself, and controls retry, continuation and stop reason. The current advisor keeps its endpoint and behavior.

## Technical Context

**Language/Version**: TypeScript on Node.js 22+, existing Vite browser client

**Primary Dependencies**: Existing TypeScript, Node HTTP server, Vite and Google Gemini REST adapter; no new runtime dependency planned

**Storage**: Process-local game sessions and temporary process-local agent runs; no persistence

**Testing**: Node built-in test runner with fake model/transport, controlled clock and existing Playwright browser E2E

**Target Platform**: Browser client and TypeScript Node backend

**Project Type**: Existing single-player browser game with server-owned state and API

**Performance Goals**: Each local tool completes within 100 ms; each result is at most 8 KiB; one run stops within 30 s and uses no more than six provider attempts.

**Constraints**: Four agent steps; three executed tools; six provider attempts across the whole run; each attempt at most 10 s and clipped to remaining deadline. Only the existing server-selected Google model chain. Tools are exactly `get_shop_context` and `evaluate_plan`. No game mutation, free-form goal, second provider, new dependencies or broad refactor. Existing advisor retains its own 85 s behavior.

**Scale/Scope**: One active AI operation per game across both shop actions; one user-triggered in-memory run, two strategies, at most 100 red-food projection iterations.

## Constitution Check — before design

| Principle | Gate | Notes |
|---|---|---|
| Server-authoritative state | PASS | Backend snapshots and game transitions remain authoritative; evaluator is pure and does not publish state. |
| Validate every trust boundary | PASS | Exact model/tool schemas, phase, scope, budget, result semantics and final evidence are runtime checked by the backend. |
| Small, original and scoped | PASS | One fixed shop action, two tools, two strategies; no database, provider or framework change. |
| Verification and evidence | PASS | Evidence 014 contains the 55-test pre-feature baseline and frozen W05 evals; feature tests will use fakes. |
| Narrow read-only AI boundary | PASS after this task's narrow governance update | Constitution 1.3.0 and `AGENTS.md` now name only feature 002 and this approved feature 003; both are read-only, and backend policy owns actions, final choice and stopping. |

No clarification remains: thresholds, prices, permitted strategy set, provider chain, call counts, deadlines and output expectations are specified by the user prompt and verified against current sources. The earlier W05 guide's general SpecKit suggestion is superseded by this concrete feature package; user has now explicitly chosen Spec Kit.

## Research summary

See [research.md](research.md) for alternatives, rationale and source review. Reuse the game's actual XP rules, isolate a pure bounded projection, use a provider-neutral single-step interface with the existing Google transport, and keep application state machine as the only execution authority.

## Design and contracts

- [Data model](data-model.md): run lifecycle, phase, counters, proposals, evidence and terminal status.
- [Contracts](contracts/): endpoint/DTO, model-step envelope, tool allowlist and validation rules.
- [Quickstart](quickstart.md): runnable offline checks and controlled manual/browser review after implementation.
- Frozen cases and original pre-feature baseline: [Evidence 014](../../docs/tracking/evidence/EVIDENCE_014.md).

## Application-controlled flow

```text
HTTP preflight / shared per-game gate / direct deterministic exits
  → app creates run and captures authoritative snapshot + revision
  → app asks model for exactly one proposal
  → app validates format + phase + allowlist + arguments + scope + budget + repetition
  → app alone executes the permitted tool
  → app validates output shape + size + meaning + freshness
  → app decides next allowed phase or terminal stop
  → model final references run evidence
  → app validates references and recomputes winner/status itself
  → UI renders values produced from validated app data
```

The model never invokes a function directly. Invalid messages, rejected tool proposals, invalid tool outputs, stale state and terminal provider failures follow application-defined stop/recovery paths. A proposal is not an approval. During a successful normal run, model proposals are: context, first strategy evaluation, second strategy evaluation, final evidence reference. If Extra XP is unavailable, only save is evaluated and the application permits final after three model steps/two tool calls. The application does not follow model-proposed extra steps.

## Implementation sequence

1. **Pre-implementation gates:** keep frozen eval IDs W05-01–W05-25; update the project boundary for exactly this second read-only shop action; preserve the existing advisor contract. Capture a fresh current-tree baseline if implementation starts from a later revision.
2. **Pure evaluation and schemas:** extract only reusable XP/price helpers if safe; implement bounded local projection and exact validators. Test threshold/multi-level behavior against `snakeEngine.ts`, both life prices, 100-food boundary, overflow, cap and no mutation.
3. **Model-step adapter boundary:** normalize one model step into one proposal or one final object; preserve approved Google adapter behavior and classification. Do not put provider SDK details in the run state machine.
4. **Orchestrator/state machine:** add phase allowlists, one proposal at a time, context/evidence binding, semantic checks, repeated-call signatures, global attempt/tool/step/time budgets, cancellation/stale checks, safe errors and cleanup. Add one shared per-game AI gate so advisor and life plan cannot overlap.
5. **HTTP and client contract:** add a separate empty-body life-plan route and strict public response validator. Keep the current `shop-advice` route and DTO unchanged. Return direct `already_affordable`/`life_cap` application outcomes with zero provider calls.
6. **UI:** add the second button in the current shop; disable both AI actions while either is in flight; show one honest generic progress line. Render safe status, comparison, generated numbers and projection assumptions from validated values only.
7. **Verification and evidence:** run each frozen case using fake transport and deterministic time, full typecheck/test/build, security scan, API/browser E2E and state invariance checks. Record exact outputs and limits. Live calls require separate explicit authorization; none are planned for automatic tests.

## Constitution Check — after design

| Principle | Result | Design evidence |
|---|---|---|
| Server-authoritative state | PASS | Pure evaluator operates on a copied sanitized context; no manager transition or publish method is called. |
| Validate every trust boundary | PASS | Backend validates every model proposal, tool result, evidence reference and public DTO; rejected proposals have zero tool executions. |
| Small, original and scoped | PASS | Uses current stack, two allowlisted read-only operations, one fixed user goal and temporary memory only. |
| Verification and evidence | PASS | Frozen 25-scenario matrix, 55/55 baseline, fake-first plan and required gates documented. |
| Narrow read-only AI boundary | PASS | Feature 003 named in the amended Principle V; no arbitrary provider, action or model authority. |

**Gate result: PASS.** No unjustified constitutional violation or unresolved requirement remains.

## Project Structure

### Documentation (this feature)

```text
specs/003-ai-plan-to-next-life/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── life-plan-api.md
│   ├── model-step.md
│   └── tools.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
server/ai/                 # bounded run/orchestrator, tool execution, step adapter
server/httpServer.ts       # separate endpoint and request cancellation boundary
server/gameSession.ts      # read-only authoritative snapshot and revision access only
src/game/snakeEngine.ts    # existing XP thresholds/award rules; narrow pure helper reuse
src/ai/                    # exact public W05 result schema/validator
src/api/gameClient.ts      # W05 API request/response validation
src/main.ts                # shop button, pending state, safe result rendering
index.html                 # second shop action and status/result region
src/styles.css             # reuse current shop visual style
tests/                     # pure evaluator, orchestrator, API and regression tests
scripts/e2e/               # extend fake-server browser smoke only if needed
```

**Structure Decision**: keep the existing client/server tree. Add only narrow W05 modules and tests next to the current AI and API boundaries. Avoid a general agent framework or broad transport refactor.

## Complexity Tracking

No new project, service, database, dependency or general-purpose abstraction is introduced. A small provider-neutral step interface and shared per-game gate are justified by the requirement to run two independent AI actions safely while preserving the existing advisor.
