# Week 4 Reliable AI Integration — Detailed Project Guide

This guide extracts the Week 4 assignment and teaching materials into an actionable plan for RETRO SNAKE. It is a course-informed project guide, not a new product specification.

## 1. Read the scope before the assignment

The generic Week 4 assignment asks students to add one user-visible AI feature through a TypeScript backend and a live provider. It covers API keys, provider choice, timeouts, retry, fallback, usage telemetry, and a limited live demonstration.

RETRO SNAKE's current project contract is intentionally narrower:

- The browser game remains local and uses the existing TypeScript/Vite app.
- The only AI feature is a local, user-triggered, read-only Hint.
- The only tool is `get_game_state` with its strict documented input/output.
- The model path is fake/mock. There is no backend, API key, provider SDK, external request, or network call.
- AI output cannot issue movement commands or mutate any game/configuration state.

Therefore, the Week 4 provider architecture is useful as design education, but its live-provider requirements are **not acceptance criteria for this repository**. Do not add them just to make this project resemble the generic assignment. A future provider/backend change would require an explicit user-approved scope change and corresponding updates to `AGENTS.md`, the game/tool specifications, security design, tests, and evidence.

## 2. What Week 4 teaches

### A. Design one useful scenario

Before implementation, write down who triggers the feature, when it runs, which minimum input it needs, what output helps the user, how long the user should wait, what can fail, and how success is validated. Do not put a slow model operation in a frame-by-frame game loop. The existing button-triggered Hint is the intended project shape.

### B. Treat the tool as a contract

A tool contract should state purpose, strict input, output, caller/scope, side effects, failure behavior, and what it must never reveal or change. A tool name or TypeScript type alone is not sufficient.

Keep the trust checks distinct:

1. **Parse/validate:** does the input have exactly the allowed shape and values?
2. **Authorize/allowlist:** is this operation allowed from this caller?
3. **Execute:** only the specific allowed read-only tool runs.
4. **Validate output:** does the returned data satisfy runtime shape, limits, and safe semantics?
5. **Map:** return only the documented safe result or fallback to the UI.

For this local application there is no external identity or authorization service. The applicable gate is the `runHintFlow` caller restriction and strict single-tool allowlist. Do not invent an auth layer.

### C. Validate structure and meaning

Structured output has multiple failure layers:

1. empty or missing response;
2. malformed JSON;
3. JSON with the wrong fields, types, lengths, or enum values;
4. structurally valid output that is unsupported, nonsensical, or unsafe in relation to the game snapshot.

Reject invalid values before display. The UI should not parse arbitrary AI prose as an action. `HintResponse` is display-only; game input remains under the existing controls.

### D. Classify failures before selecting a response

The provider materials distinguish application preflight, transport, provider API, provider content, application validation, and UI/API failures. That classification helps diagnose issues, but only local categories apply to the current fake path:

| Failure category | Current RETRO SNAKE treatment |
|---|---|
| Invalid tool proposal/input | Reject before tool execution; safe message; zero calls |
| Unsupported tool | Reject by allowlist; zero calls |
| Malformed tool snapshot | Reject; do not show a hint |
| Malformed final response | Reject; do not show a hint |
| Fake-model exception/failure | Show safe local fallback; leave game state unchanged |
| Real HTTP/provider status, refusal, rate limit, or network timeout | Not produced by the approved local flow; do not claim these have been tested |

The source materials give generic provider guidance: `400`/invalid request and `401`/`403` configuration or permission errors are not transient retries; `429`, transient `5xx`, and some timeouts may be retry candidates only under a finite policy; safety refusal, cancellation, malformed output, invalid input, and authorization/privacy rejection must not be retried or routed to another provider to evade policy. These rules are reference-only here because no provider transport is allowed.

For future provider work, the detailed distinction is:

| Signal | Generic course guidance | RETRO SNAKE now |
|---|---|---|
| `400` / invalid schema/request | Fix the request; no identical retry or fallback | No HTTP request exists |
| `401` / `403` | Stop; fix configuration/entitlement; never route around authorization | No provider credentials or auth are allowed |
| `404` model/endpoint | Verify the exact model capability first; only then consider an explicitly allowlisted alternative | Not applicable |
| `408` / timeout | Enforce deadline/abort; retry only if operation and total budget make it safe | Fake-model exception can be tested; no network timeout claim |
| `409` conflict | Usually no retry; reload/reconcile state or return a controlled error | No external state service |
| `429` | Respect `Retry-After` when available, bounded backoff with jitter, and reduce parallel load | Not applicable |
| Transient `500` / `502` / `503` | Bounded retry; fallback only if this failure class is explicitly allowed. `503` does not itself prove a token-limit problem | Not applicable |
| Context/token limit | Reduce or bound input/output deliberately; don't randomly change provider | Output/input bounds still apply to local contracts |
| Refusal/policy/privacy rejection | Terminal safe outcome; never switch provider to evade a rule | Fake path must still fail safely if configured to return a refusal-like failure |
| Empty, malformed, schema-invalid, or semantically wrong output | Reject before display; no blind retry/fallback for deterministic contract failure | Runtime validation and negative tests apply |
| Missing required tool call | Tool-contract/model behavior error, not a transport timeout | Invalid/unsupported fake proposals are rejected |
| Cancellation | Propagate cancellation; do not start another attempt | No loop or retries |

Retry and fallback are separate policies. Retry repeats the same operation/model after a classified transient error; fallback changes the model/provider or returns a defined safe application result. If ever authorized, both must share one total deadline, fixed max-attempt count, bounded backoff, cancellation handling, and observable per-attempt records. Hidden SDK retries and parallel model races undermine cost, latency, and evidence.

### E. Retry and fallback are different

- A **retry** repeats the same operation after a specifically classified transient failure.
- A **fallback** chooses a different allowed route or a safe application outcome.
- Both require a finite attempt limit and total time budget in a live integration. Hidden SDK retries make evidence and usage inaccurate.
- A fallback must not bypass validation, privacy, safety, or authorization. It must be recorded as a separate attempt.
- The current fake Hint has no network retry or provider fallback requirement. A local safe error is the correct failure outcome.

### F. Keep data and diagnostics small

Send or expose only the minimum facts needed by the operation. Never place keys, environment values, private payloads, source dumps, complete hidden state, raw prompt/response, or stack traces in UI output or evidence. Missing token/cost values stay unknown; do not estimate them from string length. For this project, a local fake model has no provider token usage to report.

For a live service (reference only), a safe internal event can capture a logical interaction ID, ordered attempt number/kind, operation, provider/model, phase, sanitized status/error class, latency, attempt count, fallback/cache status, and provider-reported usage when available. Keep the public user error separate from internal diagnostics. Never claim live usage or latency from fake tests.

## 3. Action plan for reviewing the existing project

Do not implement new behavior until the review checklist has been completed against the current working tree.

### Step 1 — Confirm the existing state

- Inspect `git status --short` and preserve unrelated changes.
- Read `AGENTS.md`, `docs/INSTRUCTIONS.md`, `docs/specs/BASE_GAME_SPEC.md`, `docs/specs/TOOL_CONTRACT.md`, and the relevant build prompt.
- Inspect `src/ai/hint.ts`, the Hint UI, the game state transition/config files, and `tests/hint.test.ts` / `tests/snake.test.ts`.
- Run the current required checks before making changes, and record actual output. If a check already fails, document it before attempting a fix.

### Step 2 — Verify the feature contract

- Confirm there is one user-triggered Hint flow, outside the real-time loop.
- Confirm strict tool-name and input validation happens before execution.
- Confirm only `get_game_state` is available and caller ownership is enforced.
- Confirm the snapshot is sanitized and read-only.
- Confirm tool output and final response have runtime validation, including limits and allowed values.
- Confirm a Hint is advice only and cannot trigger a movement or state transition.

### Step 3 — Verify failure and test boundaries

- Check success and exact call count/arguments.
- Check invalid arguments and unsupported tools produce zero tool calls.
- Check malformed tool output, malformed final output, and fake-model failure.
- Check no invalid/failure response appears as a successful hint.
- Check game state is unchanged for all Hint outcomes.
- Keep all automatic tests offline, deterministic, and secret-free.

### Step 4 — Make only justified corrections

- For each gap, state the requirement, observed behavior, smallest fix, and test that proves the fix.
- Change one coherent boundary at a time. Do not add backend/provider/retry/fallback architecture to address a mock-only issue.
- Add or update focused tests; do not weaken existing tests.
- Update the spec only if the user-approved product requirement itself changes.

### Step 5 — Capture results and hand off

- Run `npm run typecheck`, `npm test`, and `npm run build` after implementation changes.
- Update [`EVIDENCE_004.md`](../evidence/EVIDENCE_004.md) with Hint-specific expected cases and actual outcomes. Keep the core game baseline/evals in [`EVIDENCE_003.md`](../evidence/EVIDENCE_003.md).
- Update [`WORK_LOG.md`](../WORK_LOG.md) with prompt/spec links, evidence links, files changed, commands/results, known limits, and the next step.
- Update [`AI_USAGE_LOG.md`](../AI_USAGE_LOG.md) for material AI-assisted decisions without private chain-of-thought.
- State explicitly that fake-provider tests do not prove live provider availability, network timeout behavior, or generated-advice quality.

## 4. Evidence packet contents

For this repository's Week 4 milestone, the evidence should include:

- the scenario and user trigger;
- links to the actual prompt and tool contract;
- the strict input/output contract and allowlist;
- the local fake/mock flow and sanitized snapshot boundary;
- success, invalid-before-call, unsupported-tool, malformed-output, and fake failure cases;
- call counts and arguments for the tool invocation/rejection paths;
- proof that game state remains unchanged;
- actual typecheck/test/build output;
- the diff or implementation paths reviewed;
- known limitations: fake model only; no live provider, cost, latency, or real timeout evidence;
- accurate contribution information.

Do not create duplicate global eval/baseline files. Keep each evaluation table inside the evidence record for the task it belongs to.

## 5. Map the course artifacts to this repository

The assignment suggests separate `AI_FEATURE_SPEC.md`, `AI_FEATURE_PROMPT.md`, `AI_PROVIDER_CONTRACT.md`, `AI_EVALS.md`, and `EVIDENCE_W04.md`. Avoid creating duplicate files where the repository already has a clear owner:

| Course artifact/content | RETRO SNAKE location | Applicability |
|---|---|---|
| Feature scenario/spec, acceptance, out of scope | `docs/specs/BASE_GAME_SPEC.md` plus the AI Hint section in `docs/specs/TOOL_CONTRACT.md` | Applicable for core rules; accepted feature specs own approved additions |
| Prompt for the bounded flow | `docs/prompts/week3/BUILD_PROMPT_FINAL_VERSION.md` | Applicable; fake/mock scope only |
| Provider contract | `docs/specs/TOOL_CONTRACT.md` | Its tool and response contract applies; external provider fields (key, model, provider timeout) do not |
| AI eval cases | Hint-specific table inside `docs/tracking/evidence/EVIDENCE_004.md` | Applicable and task-specific |
| W04 evidence | `docs/tracking/evidence/EVIDENCE_004.md` | Applicable; actual local mock results only |
| AI usage | `docs/tracking/AI_USAGE_LOG.md` and `docs/tracking/WORK_LOG.md` | Applicable; do not log private chain-of-thought |

The Week 4 assignment requires at least four provider-oriented evals (normal success, invalid local input with zero provider calls, provider failure/timeout, malformed output). For this repository adapt these to valid fake Hint, invalid/unsupported proposal with zero tool calls, fake-model failure, and malformed output. A fake exception is not evidence of a real network timeout.

## 6. Course-only provider work, if a future task explicitly changes scope

The generic course assignment expects a server-side boundary and may ask for a provider/model, server-only key, endpoint, explicit request/response contracts, timeouts, bounded retry, safe errors, a fake provider, and a small live smoke test. The reliability addendum further discusses status classification, model chains, fallback policy, provider capability checks, telemetry, token usage, caching, quotas, cancellation, and provider-specific adapters.

None of those live integration tasks are authorized by the current RETRO SNAKE contract. If the scope is explicitly changed later, plan them as a separate feature and address at least:

- provider-neutral application contract with provider-specific adapters; the feature service owns scenario, bounded input, and business rules, the gateway/router owns allowlisted selection and overall budgets/telemetry, and each adapter owns SDK mapping and provider error normalization;
- server-side secret storage and model allowlist; never put a real key in browser code, Git, prompts, screenshots, evidence, fixtures, or user-visible logs; use placeholder-only example config and rotate any leaked key;
- explicit provider/model selection policy. The course recommends Gemini as a teaching default and says provider brand is not graded; choose the least expensive model that reliably meets the scenario, and do not let browser input select arbitrary models;
- input/output bounds, strict schema plus semantic validation;
- explicit timeout/deadline, cancellation propagation, retryable error classes, and a maximum total attempt budget; a timed-out public result must not silently turn into success later;
- no retry/fallback for invalid input, authorization/privacy rejection, cancellation, safety refusal, or deterministic schema errors;
- finite ordered fallback only for approved transient classes, with every attempt observable;
- verify model capability through the exact structured-output/tool flow; model listing alone does not prove support, and fallback must not evade a refusal or policy;
- fake-transport tests before any opt-in live smoke test;
- privacy-safe telemetry and explicit limitations.

Provider names, model IDs, SDK syntax, status behavior, and capability lists can change. Verify current provider documentation only if such a future integration is authorized; do not treat the examples in these course files as current SDK instructions.

## 7. Course workflow, demo, and assessment notes

The assignment recommends this order: stabilize the W03 project → establish the frontend/backend boundary → select a scenario → specify it → define contracts → build a fake provider → implement the endpoint → validate input/output → add timeout/error policy → test → only then connect a live provider → capture evidence → review the diff and play-test. For RETRO SNAKE, stop before backend/provider work; the remaining local steps are contract, fake flow, validation, negative/failure tests, evidence, and review.

For pair assignments, one person may drive specification/implementation while the other reviews architecture, secrets, tests, and evidence; switch roles and record each person's real contribution. Existing project records describe this repo as independent work, so do not rewrite those contribution claims to imply a pair.

The generic six-minute demo structure is: scenario (0:00–0:45), architecture (0:45–1:30), success (1:30–2:30), contract/validation (2:30–3:30), one failure (3:30–4:30), fake tests (4:30–5:15), evidence/limitations/contribution (5:15–6:00). Adapt architecture to show local UI → Hint flow → fake model/tool; explicitly state there is no backend/provider.

The assignment's grading weights are: feature design 10%, frontend/backend architecture 15%, security/secrets 15%, specification discipline 10%, request/response contract 10%, runtime validation 10%, reliability 10%, tests/fake provider 10%, evidence/reproducibility 5%, and member understanding 5%. These are course grading criteria; provider/backend points are out of scope by project contract, not a reason to change the product unilaterally.

The assignment's suggested live API budget (up to 20 development calls and 5 demo calls) and provider dashboard are course guidance for live integrations. This local mock-only project should make zero live calls; do not interpret those numbers as a target.

## 8. Source materials and precedence

This guide summarizes the user-provided materials:

- `SITA_AI_Bootcamp_2026_W04_Assignment_Reliable_AI_Integration.md`;
- `week-04-provider-errors-reliability-and-fallback.md`;
- `week-04-ai-api-integration-addendum.md`;
- `week-04-session-01-session-material.md`.

Provider integration and retry examples are educational guidance. The current project specifications and user-approved scope take precedence.
