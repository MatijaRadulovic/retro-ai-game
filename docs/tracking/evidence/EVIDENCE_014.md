# Evidence 014 — W05 life-plan preparation

## Record and task context

- **Purpose / accepted goal:** preserve the user's exact W05 prompt and prepare a concrete implementation plan. The current user message explicitly limits this turn to planning and excludes SpecKit; no feature code is authorized in this turn.
- **Governing plan:** [W05 life-plan plan](../../specs/WEEK05_AI_PLAN_TO_NEXT_LIFE_PLAN.md).
- **Exact prompt artifact:** [W05 build prompt v1, verbatim](../../prompts/week5/BUILD_PROMPT_AI_PLAN_TO_NEXT_LIFE_V1.txt). SHA-256: `0324b040d7602ac904bcc14d3b96062adffbc6763aa4dad052577e945f8cc544`; copied byte-for-byte from the user attachment. Instructions in that artifact to implement now/use SpecKit are superseded by the user's latest request to plan only without SpecKit.
- **Starting state:** pre-existing uncommitted W05 guide/checklist and tracking changes from the prior documentation turn (`git status --short` showed `docs/INSTRUCTIONS.md`, `docs/tracking/AI_USAGE_LOG.md`, `docs/tracking/WORK_LOG.md` modified and two new W05 checklist files). These changes were preserved.
- **Sources actually inspected:** `AGENTS.md`, `docs/INSTRUCTIONS.md`, instructions 01–05, W05 guide/checklist, `weekly-assignment.md`, feature 001 and 002 specs, Gemini V2 plan, shop tool/API contracts, `src/game/snakeEngine.ts`, `server/gameSession.ts`, `server/httpServer.ts`, `server/ai/shopAdvice.ts`, `server/ai/geminiTransport.ts`, `src/ai/shopAdvice.ts`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `package.json`, relevant test filenames, and Evidence 013.
- **Conflict priority / risks:** current user's plan-only/no-SpecKit instruction takes priority over the attached prompt's implementation/SpecKit directions. The attached prompt explicitly authorizes one additional read-only shop action; current project instructions still describe one active AI flow and must be narrowly updated during implementation. Current browser abort through the Vite proxy is not guaranteed to stop backend provider work; stale-result suppression and backend deadline remain required.
- **Scope / out of scope:** documentation, baseline and frozen eval definitions only. No source changes, live provider call, secret-file access, push or deployment.

## Baseline before W05 implementation

- `npm test` on 2026-10-07: exit **0**; built-in typecheck passed; Node test runner reported **55 tests, 55 passed, 0 failed, 0 skipped**. This verifies the existing code, not the proposed W05 feature.
- Current `ASK SHOP AI` route is single-answer, with no model-proposed tool; new W05 behavior below is **N/A — capability absent** at baseline.
- `weekly-assignment.md` and `weekly-assignment(1).md` were compared byte-for-byte (`cmp` exit 0); the path requested inside the pasted prompt is available.
- Baseline `npm run build`, `npm run typecheck` as a separate command, browser E2E and live provider test were not run in this planning turn. `npm test` already executes typecheck; implementation work will record its own complete baseline and after checks.

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
