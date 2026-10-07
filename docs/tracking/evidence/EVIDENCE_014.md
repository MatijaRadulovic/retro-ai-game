# Evidence 014 — W05 life-plan preparation

## Record and task context

- **Purpose / accepted goal:** implement the user-approved Week 5 AI plan-to-next-life workflow under Spec Kit feature 003, keeping the application as the sole authority for validation, tool execution, continuation, recovery and stopping.
- **Governing plan:** [Feature 003 spec](../../../specs/003-ai-plan-to-next-life/spec.md), [implementation plan](../../../specs/003-ai-plan-to-next-life/plan.md), [task list](../../../specs/003-ai-plan-to-next-life/tasks.md), and the initial [W05 plan](../../specs/WEEK05_AI_PLAN_TO_NEXT_LIFE_PLAN.md).
- **Exact prompt artifact:** [W05 build prompt v1, verbatim](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt). SHA-256: `0324b040d7602ac904bcc14d3b96062adffbc6763aa4dad052577e945f8cc544`; copied byte-for-byte from the user attachment. Instructions in that artifact to implement now/use SpecKit are superseded by the user's latest request to plan only without SpecKit.
- **Starting state:** pre-existing uncommitted W05 guide/checklist and tracking changes from the prior documentation turn (`git status --short` showed `docs/INSTRUCTIONS.md`, `docs/tracking/AI_USAGE_LOG.md`, `docs/tracking/WORK_LOG.md` modified and two new W05 checklist files). These changes were preserved.
- **Sources actually inspected:** `AGENTS.md`, `docs/INSTRUCTIONS.md`, instructions 01–05, W05 guide/checklist, `weekly-assignment.md`, feature 001 and 002 specs, Gemini V2 plan, shop tool/API contracts, `src/game/snakeEngine.ts`, `server/gameSession.ts`, `server/httpServer.ts`, `server/ai/shopAdvice.ts`, `server/ai/geminiTransport.ts`, `src/ai/shopAdvice.ts`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `package.json`, relevant test filenames, and Evidence 013.
- **Conflict priority / risks:** current user's plan-only/no-SpecKit instruction takes priority over the attached prompt's implementation/SpecKit directions. The attached prompt explicitly authorizes one additional read-only shop action; current project instructions still describe one active AI flow and must be narrowly updated during implementation. Current browser abort through the Vite proxy is not guaranteed to stop backend provider work; stale-result suppression and backend deadline remain required.
- **Scope / out of scope:** documentation, baseline and frozen eval definitions only. No source changes, live provider call, secret-file access, push or deployment.

## Baseline before W05 implementation

- **Week 4 end-state baseline:** The existing `ASK SHOP AI` in the paused perk shop used current points, perk prices and caps to recommend Extra XP, Luck, +1 Life or waiting; the backend validated the advice and never bought a perk. [Evidence 010](EVIDENCE_010.md) records its approved model chain and 55/55 automated baseline. [Evidence 013](EVIDENCE_013.md) records a pre-W05 browser E2E run of **7 passed, 0 skipped, 0 failed** with a fake provider, including fallback, state invariance and stale-result suppression. This existing W04 browser record is the appropriate browser baseline; it was overlooked in later W05 gap summaries.
- `npm test` on 2026-10-07: exit **0**; built-in typecheck passed; Node test runner reported **55 tests, 55 passed, 0 failed, 0 skipped**. This verifies the existing code, not the proposed W05 feature.
- Current `ASK SHOP AI` route is single-answer, with no model-proposed tool; new W05 behavior below is **N/A — capability absent** at baseline.
- `weekly-assignment.md` and `weekly-assignment(1).md` were compared byte-for-byte (`cmp` exit 0); the path requested inside the pasted prompt is available.
- Baseline `npm run build`, `npm run typecheck` as a separate command and browser E2E were not rerun in this planning turn. The existing W04 browser result is in Evidence 013; `npm test` already executes typecheck. Implementation work records its own baseline and after checks.

## Frozen W05 eval scenarios, defined before code

These IDs and expectations are fixed for the first implementation comparison. Fixtures will use controlled time, a fake provider/transport and authoritative snapshots; no network or secret is needed. Change expectations only with an explicit new version and reason. All W05 baseline results are `N/A — capability absent`.

| ID | Scenario | Expected result / measurable boundary |
|---|---|---|
| W05-01 | Paused shop; both strategies available; scripted valid proposals and final | 4 model steps, `get_shop_context` once, `evaluate_plan` twice, exactly 3 tool executions, valid evidence IDs and completed recommendation; no state/revision/RNG/timer change. |
| W05-02 | Extra XP unaffordable or level 5 | Only context and save evaluation needed; 3 model steps, 2 executed tools; unavailable reason from context; no fictional B comparison. |
| W05-03 | Already enough points for next life | Direct application result, `providerAttempts=0`, `toolCalls=0`, no game mutation. |
| W05-04 | Two held lives | Preflight unavailable, `providerAttempts=0`, `toolCalls=0`, even when points are high. |
| W05-05 | Missing game, non-paused game, malformed/nonempty body, overlapping AI request | Rejected or safe busy per API contract before provider/tool execution. Cross-action overlap between `ASK SHOP AI` and W05 is included. |
| W05-06 | XP just below/at/above level thresholds, including a single award crossing multiple levels | Evaluator uses exact cumulative thresholds and grants one point for every crossed level; compare with engine helper. |
| W05-07 | Life charge count 0 versus 1 | Target cost is 5 versus 8, using actual unspent points, including Lucky-earned points already held. |
| W05-08 | Strategy B affordable at current Extra XP level | Subtract exactly next Extra XP cost once, raise hypothetical level once, add `10 + 2 × newLevel` XP per red food; canonical game is unchanged. |
| W05-09 | Both strategies reach goal at same food count | Save wins tie even if model proposes B; contradictory final is rejected. |
| W05-10 | Only one strategy reaches within 100 foods | Recommend only the reached strategy; other remains bounded/non-reached, with limit stated. |
| W05-11 | Goal reached exactly on 100th red food | `reached`, `foodsToGoal=100`. |
| W05-12 | Goal remains unmet after 100 foods for one/both strategies | `not_reached_within_limit`; no claim of impossibility; if both non-reached final is incomplete with no winner. |
| W05-13 | Unknown tool or tool proposed in wrong phase | Zero executions for that proposal; classified terminal stop, no corrective retry. |
| W05-14 | Extra/wrong/missing argument field; `foodLimit` other than 100 | Zero executions for that proposal; exact schema rejection. |
| W05-15 | Empty, malformed, oversized or semantically invalid local tool output | Output never enters the next model context or a success response. |
| W05-16 | Same tool and canonical arguments proposed again at same start revision | Rejected before execution; repeated-action stop reason. |
| W05-17 | Final proposed before necessary evaluations, multiple actions in one response, or extra final fields | Rejected; no success display. |
| W05-18 | Fabricated, repeated, missing or unrelated evidence ID | Final rejected; only current-run validated evaluation IDs accepted. |
| W05-19 | Model final contradicts numeric comparison, tie rule, availability or no-reach rule | Semantic validation rejects it; no recommendation shown as success. |
| W05-20 | Provider timeout/transient failure/allowed fallback and terminal auth/refusal/invalid output | Classified retry/fallback only for allowed transient/capability cases, preserving V2 per-model maxima; terminal case has no extra attempt. |
| W05-21 | Failures across several model steps and fallback models | At most 6 provider attempts for the **whole** run; counter never resets at next step/fallback. |
| W05-22 | Run reaches 30 s deadline or step/tool-call limit | No further model/tool execution; active work cancelled where possible; safe stop reason. |
| W05-23 | Purchase, resume, restart, shop close, revision change or request cancellation during run | Stale/cancelled result not displayed; pending work stopped where possible; lock/run cleanup always occurs. Direct backend abort and proxied browser behavior recorded separately. |
| W05-24 | Privacy/telemetry probe | Only anonymous run/attempt metadata; no credential, game/session ID, raw context/prompt/response, chain-of-thought or unrelated state in logs/browser. |
| W05-25 | Existing `ASK SHOP AI` plus new button/API | Existing route/DTO/fallback behavior and game play regressions remain; no overlap or hidden provider calls. |

## Controlled change — planning iteration 1

- **Reason:** turn a detailed user prompt and Week 5 guidelines into a reviewable, repository-specific plan before implementation.
- **Change:** save the exact prompt artifact; define architecture, tool/final contracts, code touchpoints, budgets, stages and frozen evals; update only documentation/tracking.
- **Evidence status:** scenario expectations are frozen, but no W05 after result exists. Do not mark checklist items Verified from this plan.

## After verification for this planning iteration

- Verbatim prompt copy: `cmp -s` against the attachment, exit **0**; SHA-256 matches the value above.
- Markdown links: **213** relative links checked across the seven touched documentation files; **0** missing targets.
- Formatting: **0** trailing-whitespace/tab issues in those seven files; `git diff --check` exit **0**.
- `npm test`: exit **0**, **55/55** existing tests pass (including its built-in typecheck), as recorded in Baseline. No W05 test is claimed to pass.
- Separate `npm run typecheck`, `npm run build`, browser E2E, `npm run security:scan` and live calls were skipped for this documentation-only planning turn. No push was made, so the pre-push guard was not triggered. These remain implementation verification steps.

## Honest limitations and handoff

The existing 55/55 test baseline establishes only the pre-feature code state. The exact provider step adapter and shared lock require the narrow implementation work described in the plan. The 30-second total deadline may make fallback exhaustion more frequent than W04's 85-second path; it must remain a hard cap. The Vite proxy's cancellation behavior was previously observed as limited, so do not claim immediate backend stop on browser abort without a new executed check.

## Controlled change — planning iteration 2 (Spec Kit design)

- **Reason:** the user superseded the earlier no-SpecKit instruction and asked to elaborate the feature with Spec Kit, explicitly requiring the application to validate message format/action/result and own continuation and ending decisions.
- **Scope:** added feature 003 specification, plan, research, data model, API/model/tool contracts, quickstart and quality checklist. Amended Constitution 1.2.0 → 1.3.0 and aligned `AGENTS.md`/AI security instructions to permit only this specifically approved second read-only shop flow, while making backend authority explicit. Updated the W05 guide/checklist and docs index. No implementation changed.
- **Specification authority rule:** model messages remain proposals. Backend validates exact shape, phase, allowlist, arguments, scope/revision, repetition and budget; only backend executes tools, validates result shape/size/meaning, chooses the final strategy, selects recovery/continuation, and assigns the terminal stop reason. Invalid proposals/results cannot be treated as evidence and are handled through finite safe paths.
- **Quality review:** feature spec has no unresolved clarification markers; user stories, acceptance scenarios, measurable outcomes, edge cases, assumptions and exclusions are present. Spec quality checklist is marked reviewed. Constitution gates pass after the narrow policy amendment.
- **Verification:** `speckit-plan` setup resolved `specs/003-ai-plan-to-next-life/spec.md` and `plan.md`; prerequisite inspection lists `research.md`, `data-model.md`, `contracts/` and `quickstart.md` as available. `npm test` baseline remains 55/55 from iteration 1. No new code tests were run because this iteration changes planning/governance documentation only. Final Markdown/link/diff checks are recorded below.

### Handoff after iteration 2

Canonical W05 artifacts are under `specs/003-ai-plan-to-next-life/`. The earlier `docs/specs/WEEK05_AI_PLAN_TO_NEXT_LIFE_PLAN.md` is retained as the initial planning note and points to the canonical Spec Kit feature. Implementation remains pending and must follow the feature's contracts and frozen W05-01–W05-25 evals. No live provider calls, secret-file access, push or deployment occurred.

### Iteration 2 documentation verification

- Feature spec quality: no clarification markers or unfilled Spec Kit template placeholders; requirement-quality checklist reviewed.
- Markdown links: **239** relative links checked across **19** changed documentation/Spec Kit files; **0** missing targets.
- Formatting: **0** trailing-whitespace/tab issues; `git diff --check` exit **0**.
- Code typecheck/tests/build/E2E/security scan/live provider were skipped because this iteration only changes planning and governance documents. No push was made; pre-push guard did not apply.


## Implementation iteration 1 — baseline and task setup

- **Authorization:** the user approved the planning artifacts and then directed: “komituj ovo pa idemo u implementaciju.” Planning artifacts were committed as `84e68cb`; implementation is now authorized under feature 003.
- **Fresh source baseline:** revision `84e68cb`, clean worktree before task generation. `npm test` exit **0** (typecheck plus **55/55** tests); `npm run build` exit **0**; `npm run security:scan` exit **0**. No W05 feature code was present at baseline; all frozen evals remain `N/A — capability absent`.
- **Task generation:** generated `specs/003-ai-plan-to-next-life/tasks.md`; no `.specify/extensions.yml` exists, so no task hooks apply. User stories: US1 comparison, US2 application authority, US3 recovery/compatibility. Implementation tasks are dependency ordered and tests are required by FR-021.
- **Scope/privacy:** fake providers and deterministic time only. No live provider calls, secret-file reads, push or deployment.

## Implementation iteration 3 — bounded life-plan flow

- **Authorization and starting point:** after reviewing the feature 003 plan, the user asked to commit it and proceed to implementation. Planning artifacts were committed as `84e68cb`; implementation started from that revision. No source changes were present in the baseline.
- **Scope delivered:** added pure server-derived life-plan context and deterministic 100-red-food projection using the game's XP, Extra XP and life-cost helpers; exact proposal/final decoding; application-owned phases, evidence binding, deterministic comparison/tie policy, run-wide step/tool/provider/deadline budgets, bounded retry/fallback, cancellation/stale checks and anonymous telemetry. Added the separate empty-body endpoint, shared per-game shop AI gate, public/client validators and paused-shop UI action. Existing `ASK SHOP AI` endpoint and advisor module contract remain.
- **Application authority:** only the current phase's exact proposal is accepted. The server validates every proposal before any tool call, recomputes tool output before accepting it, checks current revision and evidence IDs, calculates the winner, and assigns terminal status/reason. Unknown, repeated, malformed, contradictory and stale inputs cannot become a successful recommendation. The AI feature does not buy anything or mutate the game.
- **Code/test locations:** `src/ai/lifePlan.ts`, `src/game/snakeEngine.ts`, `server/ai/{aiRequestGate,lifePlan,lifePlanTools,geminiTransport}.ts`, `server/httpServer.ts`, `server/index.ts`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `src/styles.css`; fake-first tests in `tests/lifePlan.test.ts`, `tests/httpServer.test.ts`, `tests/shopAdvice.test.ts`, and browser smoke in `scripts/e2e/`.
- **Automated evidence:** fresh `npm run typecheck` exit **0**; `npm test` exit **0**, **83/83 passed**; `npm run build` exit **0**; `npm run security:scan` exit **0**; `npm run test:e2e` exit **0**, **9 passed, 0 skipped, 0 failed**. The W05 browser case uses a fake provider and confirms bounded output plus unchanged game progression. Full command rerun occurred after source changes. E2E also retained shop-advisor fallback, state invariance, cancellation, stale purchase and unavailable-provider cases.
- **W05 evaluation status against frozen expectations:** expectations in the original table above were not changed. W05-01–14, 16–21, 23–25 have automated coverage in the named unit/API/provider tests. W05-05 has API rejection and shared-gate coverage. W05-10 has a deterministic fixture where only saving reaches within 100 foods. W05-15 covers altered/extra-field result rejection and the 8 KiB output guard; a malformed result-object injection is not exposed by the deterministic local tool boundary, so keep this Partial. W05-17 covers premature/contradictory finals and a multi-proposal array rejected with zero tool calls. W05-21 now verifies the six-attempt cap across successive model steps. W05-22 verifies six attempts and deadline timeout; independent exhausted step/tool-limit fixtures remain untested. W05-23 verifies backend stale revision/cancellation and delayed life-plan browser suppression after shop close in the fake-provider E2E. Only W05-15 and W05-22 remain **Partial** in the automated matrix. Task T031 and full checklist completion remain open until those remaining evals and the human pair demo are completed.
- **Limits and skipped actions:** no live Gemini call, secret-file access, push or deployment. Pre-push guard was not run because no push was requested. The W04 browser baseline in Evidence 013 was not rerun in this implementation turn; the fresh 55/55 automated baseline and existing W04 browser record are separate comparisons. Vite proxy cancellation may not always reach the backend; direct backend request cancellation is tested, and revision-change cancellation is wired at the server session boundary.

## Compliance review iteration 4 — Week 5 guide and checklist

- **Review scope:** compared the W05 course guide and completion checklist with feature 003, implementation, tests, prior evidence and project verification instructions. No runtime source code changed during this audit.
- **Fresh checks:** `npm test` exit **0**, **83/83 passed**; `npm run build` exit **0**; `npm run security:scan` exit **0**; `npm run test:e2e` exit **0**, **9 passed, 0 skipped, 0 failed**; `git diff --check` exit **0**. E2E uses a fake provider and includes success, late-result suppression, disconnect cancellation, stale purchase and unavailable-provider paths.
- **Confirmed:** application-owned phase/allowlist decisions, exact proposal/final validation, deterministic tool/result recomputation, safe output, read-only game behavior on success, per-game concurrency gate, bounded retries/deadline, anonymous telemetry and preserved shop-advisor behavior have code/test evidence.
- **Corrections made:** the guide now points to current Evidence 014 rather than future evidence and directs implementation status to the checklist/evidence. The checklist no longer claims that a W05 failure run has a direct state-invariance assertion or that malformed local result injection is covered through the full runner. Existing tests reject altered/extra-field values and oversized outputs at the local validator/tool boundary; malformed-result injection remains unavailable through the deterministic local tool path.
- **Open status at iteration 4:** T031 remains open. W05-15 is Partial for missing malformed-result runner injection; W05-22 is Partial for independent step/tool-limit exhaustion coverage. Also open: direct failure-run state-invariance assertion, worst-case retry/fallback exercise across all model steps, and human pair demo/review. The existing pre-W05 browser result is recorded in Evidence 013. No agent-operated live-provider check was run; pre-push guard was not run because no push was requested.

## Implementation iteration 5 — close automated W05 eval gaps

- **Reason/scope:** the user asked to finish the remaining verifiable W05 follow-ups. Added a server-owned evaluator injection seam for tests only so corrupted local outputs/exceptions can be exercised through the actual agent boundary. Added a shared final-validation helper to test application selection under a tied comparison. Strengthened W05 tests and marked the frozen automated matrix outcomes below without changing their expected results.
- **Implementation changes:** invalid local evaluation results and evaluator exceptions now emit a failed `tool_call` telemetry event and stop with `invalid_tool_result` before forwarding evidence or making another model request. Normal completion still records exactly 4 steps and 3 tool calls. No user-controlled field can configure the evaluator; production construction uses the deterministic default.
- **Frozen W05-01–W05-25 outcomes:**

| Eval | Actual outcome and evidence |
|---|---|
| W05-01 | Pass — `normal run lets model propose three tools...` confirms 4 model calls, 3 successful tools, validated result and unchanged fixture snapshot; HTTP route also compares server snapshot. |
| W05-02 | Pass — `Extra XP unavailable path evaluates only saving and says why`: 3 steps, 2 tools, no fictional second strategy. |
| W05-03 | Pass — `preflight already affordable and life cap make no model call`: already-affordable path makes zero provider calls. |
| W05-04 | Pass — same preflight test verifies life cap makes zero provider calls. |
| W05-05 | Pass — HTTP tests cover missing/non-paused/malformed requests and shared per-game cross-action concurrency gate before extra work. |
| W05-06 | Pass — evaluator threshold/boundary test plus existing engine multi-level XP award test. |
| W05-07 | Pass — evaluator/context tests verify next life cost 5 versus 8 for charges 0/1. |
| W05-08 | Pass — evaluator test checks exact Extra XP cost, remaining points, and increased XP per food. |
| W05-09 | Pass — deterministic tie unit test and `validateLifePlanFinal` test reject model choice B on a tie and accept application choice save. |
| W05-10 | Pass — only-reached-strategy comparison test selects the sole reached strategy. |
| W05-11 | Pass — exact 100-food boundary returns reached at food 100. |
| W05-12 | Pass — `no strategy reaches within 100 foods...` returns incomplete with validated evidence and unchanged snapshot. |
| W05-13 | Pass — unknown tool and premature/wrong-phase proposal tests stop without executing the rejected action. |
| W05-14 | Pass — wrong `foodLimit`, extra argument and malformed argument cases stop before evaluation. |
| W05-15 | Pass — altered/extra-field, empty, oversized and throwing local tool results stop in the runner; no later model call occurs and failed tool telemetry is emitted. Direct tool output-size and semantic validators are also tested. |
| W05-16 | Pass — repeated proposal is rejected before a second execution. |
| W05-17 | Pass — premature final, multi-proposal response and extra final fields are rejected. |
| W05-18 | Pass — fabricated evidence ID is rejected by final/result validators; accepted evidence is bound to unique current-run evaluation IDs. |
| W05-19 | Pass — contradictory recommendation/reason/evidence is rejected; tie policy has direct application-final validation coverage. |
| W05-20 | Pass — transient fallback/continuation, terminal authentication failure and invalid structured output without retry are covered; the existing V2 chain's exact per-model attempt counts remain covered by shop-advisor tests. |
| W05-21 | Pass — six-attempt budget is shared across successive phases; a combined retry/fallback case consumes all six and cannot start another phase. |
| W05-22 | Pass — maximum valid run observes exactly 4 model calls/3 tools; deadline/per-attempt timeout tests stop unresolved work with a safe reason. No fifth model call or fourth tool is possible in the approved phase sequence. |
| W05-23 | Pass with recorded proxy limitation — direct cancellation, revision change, purchase/resume/restart state changes and shop-close stale-result suppression are tested. E2E observed provider attempts can continue briefly behind the Vite proxy after close; UI suppresses the late result and backend checks current revision/status before executing work. |
| W05-24 | Pass — telemetry test asserts run/step/provider/tool/stop metadata while excluding game/player IDs, shop values and raw content. |
| W05-25 | Pass — existing shop-advisor route/fallback, shared gate, state invariance and browser smoke remain green alongside life-plan route/UI tests. |

- **Fresh verification:** `npm test` (typecheck plus **91/91 tests**) exit **0**; separate `npm run typecheck`, `npm run build`, `npm run security:scan`, and `npm run test:e2e` (**9/9**) all exit **0**. `git diff --check` passes; Markdown scan checked **183** workspace-relative links with **0 missing** (4 absolute local source references were excluded).
- **Remaining non-automated item at iteration 5:** T034 human pair demo/review is not simulated or claimed. No agent-operated live-provider smoke was run; credentials remain server-runtime secrets. The preserved 55/55 fresh unit baseline and actual W04 browser result in Evidence 013 are distinct, valid records.

## Final W05 user acceptance and baseline correction

- The user reports personally trying the current feature in the browser and that it works. Earlier in the same session the user reported the life plan working after the 60-second/fallback change, then requested shorter player copy. This is **user-reported manual acceptance** of the exercised flow, separate from the fake-provider E2E and without any claim that the agent accessed a credential.
- The user confirms holding a joint W05 demo with Uroš and says both understand that the application approves tools, checks results and stops the run. A rejected proposal did **not** occur in ordinary gameplay; the controlled fake-provider/unit tests demonstrate rejection before execution (`toolCallCount === 0`). The joint demo and negative test are recorded as distinct evidence, without claiming a live rejection was shown.
- Week 4 ended with the read-only shop advisor described above. Evidence 013 already contains the pre-W05 browser run; the earlier “missing pre-feature browser baseline” label was an audit mistake, not a missing experiment to reconstruct. The W05 implementation comparisons use that existing record plus the fresh 55/55 test baseline.
- Later [Evidence 015](EVIDENCE_015.md), [016](EVIDENCE_016.md) and [017](EVIDENCE_017.md) record startup recovery, the 60-second/fallback refinement and player-facing copy. The latest automated suite passed 94/94 and fake-provider browser E2E passed 10/10. These checks and the user's manual report support the feature handoff while keeping their provenance separate.
