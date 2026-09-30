# Evidence 009 — Shop AI Advisor

## Record and task context

- **Purpose / accepted goal:** replace movement Hint with shop purchase advice using two approved Gemini models, bounded attempts, structured validation, and safe failure.
- **Governing spec/task plan:** [Shop AI Advisor spec](../../../specs/002-shop-advisor/spec.md), [plan](../../../specs/002-shop-advisor/plan.md), [tasks](../../../specs/002-shop-advisor/tasks.md), and [HTTP contract](../../../specs/002-shop-advisor/contracts/shop-advice-api.md).
- **Exact prompt artifact and version:** user request in this conversation; [Gemini shop-advisor build prompt v2](../../prompts/week4/BUILD_PROMPT_GEMINI_HINT_V2.md); [approved shop-advisor system prompt v1](../../prompts/week4/SHOP_ADVISOR_SYSTEM_PROMPT_V1.md). The approved prompt is active in `server/ai/shopPrompt.ts`.
- **Starting source/revision or working-tree state:** clean `main` at `ba3174e` before new feature files.
- **Sources actually used:** user request and free-tier clarification; `AGENTS.md`; instruction modules 03–05; current Gemini plan/tool contract; current Hint, shop, game engine, session manager, API, and tests; Google model, rate-limit, structured-output, and REST documentation.
- **Relevant sources excluded and why:** secret-file contents were not read; no real credential was supplied. Older movement-Hint responses are baseline behavior, not shop advice requirements.
- **Conflict priority and risks:** the current user request supersedes prior movement-Hint and single-model scope. Actual Gemini quotas depend on the user's project. The user's system prompt must be checked against game rules before use.
- **Scope / out of scope:** shop advice and its server/client plumbing, focused tests, docs, and security checks. Game economy and purchase mechanics do not change.

## Baseline

- Browser imports `createFakeHintModel`, `getGameStateSnapshot`, and `runHintFlow` from `src/ai/hint.ts`; it gives movement advice and does not use an API key.
- No shop-advice endpoint or Gemini request exists. Shop prices and perk levels are in authoritative server snapshots.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 33 tests, 33 passed, 0 failed.
- `npm run build`: exit 0; Vite 6.4.3 built 9 modules.
- Manual browser behavior and live Gemini availability were not checked at baseline.

## Frozen eval scenarios and before/after results

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | After iteration 2/3 | Evidence / notes |
|---|---|---|---|---|---|
| S1 | Paused shop, affordable uncapped perk, valid structured model choice | One legal buy/wait decision; no mutation | N/A — capability absent | Pass | Pass | Legal choice and unchanged manager snapshot in `shopAdvice.test.ts`; paused HTTP response and unchanged revision in `httpServer.test.ts`. |
| S2 | Zero points, capped perk, or Lucky bonus points | No unaffordable/capped advice; actual balance used | N/A — capability absent | Pass | Pass | Decision validator rejects unaffordable/capped buys; context derives actual unspent balance rather than inferring it from level. |
| S3 | Primary transient failure then success on retry | Correct order and at most two primary calls | N/A — capability absent | Pass | Pass | Fake 503 and timeout scenarios cover the two-call primary cap. |
| S4 | Primary failures, fallback retries, and congestion window | Up to three fallback calls; following requests skip primary for 15 minutes | N/A — capability absent | Partial: initial policy had one fallback call | Pass | Exact five-call exhaustion order, 1/3/5/5-second delay sequence, congestion skip, and expiry are covered with deterministic fakes. |
| S5 | Missing key, auth error, refusal, invalid output, cancellation | No further model attempt; safe unavailable result | N/A — capability absent | Pass | Pass | Missing-key HTTP result, terminal 401, blocked response, malformed decision, cancellation, and duplicate-request tests. |
| S6 | Slow provider or exhausted attempts | Calls capped at 10 seconds and total work at 65 seconds; controls usable; no recommendation | N/A — capability absent | Pass for server bound; browser manual pending | Pass for server bound; browser manual pending | Hanging fake transport settled within the shortened test deadline; client uses an asynchronous request and independent shop controls. |
| S7 | Shop state changes during pending request | Old answer discarded | N/A — capability absent | Pass for server and code; browser manual pending | Pass for server and code; browser manual pending | Server rejects changed revision; browser aborts and clears advice on new snapshot, close, purchase, and restart. |
| S8 | Public response and built browser assets | No key, raw provider payload, or private prompt | Mock path uses no key | Pass, automated/static checks | Pass, automated/static checks | Exact-key public parser, safe error mapping, production build, `security:scan`, and simulated pre-push hook. Pattern scan cannot prove absence of unknown credential formats. |
| S9 | Core game, perks, and purchases | Existing behavior remains valid | 33/33 tests passed | Pass, 44/44 | Pass, 47/47 | Includes existing Snake and perk checks. Obsolete movement-Hint tests were replaced by shop-advice tests. |

## Controlled change — iteration 1

- **Hypothesis / reason:** the old browser mock movement Hint cannot produce authoritative, current perk advice or exercise provider reliability controls.
- **Single bounded change:** replaced it with server-derived shop context, exact decision validation, a paused-only HTTP route, a fixed Gemini model pair, bounded retry/fallback, and an asynchronous shop UI.
- **Files changed:** `server/ai/`, `server/httpServer.ts`, `server/index.ts`, `src/ai/`, `src/api/gameClient.ts`, `src/main.ts`, `index.html`, `src/styles.css`, focused tests, and the linked feature/security/tracking documents. Retired `src/ai/hint.ts` and its movement-specific tests because that feature was replaced; the suite grew from 33 to 44 tests.
- **Out of scope preserved:** purchase mechanics, game rules, and automatic AI actions.

## After verification

- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 47 tests, 47 passed, 0 failed, 0 skipped.
- `npm run build`: exit 0; Vite 6.4.3 transformed 9 modules and emitted `dist/index.html` plus CSS/JS assets.
- `npm run security:scan`: exit 0; “no known credential patterns or client secret references found.”
- Configured `.githooks/pre-push` simulated for local `main` against `origin/main`: exit 0; scanned 5 outgoing and 6 other reachable commits; no known credential patterns or client secret references found. No push occurred.
- `git diff --check`: exit 0. Changed-Markdown relative link scan: passed.
- Browser manual check: unavailable because the browser runtime reported no available browser. Live Gemini check: skipped because no credential was supplied and secret files were not opened.

## Honest limitations

The actual Gemini project quotas have not yet been supplied or observed. Model capability support comes from official documentation; successful live generation, real provider latency, and visual browser behavior remain unverified. A secret-pattern scan is a guard, not proof against every possible leak format.

## Controlled change — iteration 2

- **Hypothesis / reason:** the user requested a larger retry budget and temporary routing around a repeatedly failing primary model.
- **Single bounded change:** changed orchestration to two 10-second Flash calls, three 10-second Flash-Lite calls, 1/3/5/5-second delays, a 65-second total bound, and a process-local 15-minute Flash congestion marker. Added a separate system-prompt draft for review.
- **Frozen eval results:** S3, S4, and S6 were updated to the newly accepted reliability values. Deterministic tests prove five-call order, delay values, congestion skip, expiry, terminal stop, cancellation, and the shortened test deadline.
- **Verification:** `npm run typecheck`, `npm test` (47/47), `npm run build`, `npm run security:scan`, and `git diff --check` passed. No live provider request was made.
- **New or remaining limitations:** congestion memory is intentionally lost on server restart and is not coordinated across multiple server processes. At this point in the change, the system prompt was still awaiting review.

## Controlled change — iteration 3

- **Hypothesis / reason:** the user approved the drafted strategy instruction and requested that it be made the active Gemini system prompt.
- **Single bounded change:** replaced the provisional runtime text with the approved prompt; synchronized prompt status, Spec Kit completion markers, and handoff records.
- **Frozen eval results:** existing advice structure and legal-decision validation remain unchanged; provider request fixture now carries the approved system instruction. Exact model calls and public results remain covered by the same 47-test suite.
- **Verification:** typecheck, 47/47 tests, production build, security scan, pre-push guard, Markdown link scan, and `git diff --check` passed.
- **New or remaining limitations:** the offline fake verifies request construction but does not validate generated answer quality, live model compliance, or actual project quotas.

## Controlled change — iteration 4

- **Hypothesis / reason:** stating only that the key is a backend environment variable did not show the user how to provide it safely for local use or why that boundary matters.
- **Single bounded change:** added hidden-input Bash and PowerShell setup and cleanup commands to README; linked the commands from the shop quickstart; explained that backend-only runtime configuration keeps the key out of committed files, shell history, Vite, and browser assets.
- **Frozen eval results:** documentation scenario: developer can start the backend with a locally supplied key without putting its value into a project file or command argument. README now documents both shells; the quickstart points to these instructions.
- **Verification:** changed-Markdown relative link scan passed; `git diff --check` passed. Application checks were skipped because this iteration only changed documentation.
- **New or remaining limitations:** no credential was provided or used. Secret handling and live Gemini behavior were not exercised.
