# Evidence 016 — W05 life-plan timeout and fallback recovery

## Task and baseline

- **Request:** [W05 recovery change prompt v1](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_RECOVERY_V1.md); accepted [feature 003](../../../specs/003-ai-plan-to-next-life/spec.md) and [W05 checklist](../checklists/WEEK05_BOUNDED_AGENTIC_WORKFLOWS_CHECKLIST.md).
- **Starting state:** dirty, uncommitted W05 implementation and separate startup-recovery work were preserved. Before this change, `server/ai/lifePlan.ts` defaulted/capped the run at 30,000 ms, restarted every model step at primary Flash, and used a six-attempt global budget. All unavailable causes displayed one generic message.
- **Baseline check:** `node --test tests/lifePlan.test.ts` exit 0, 33/33 tests passed before implementation. No live provider call was run. The displayed user error alone does not identify whether the cause was deadline, provider failure, invalid model proposal, or another stop reason.
- **Frozen expectations before runtime editing:** 60-second default and cap; ten-second per-attempt cap; six attempts total; authorized fallback on transient/timeout; terminal/cancelled requests stop; no purchases or game-state mutation; local tools remain under 100 ms. Specific new regression fixtures were added during implementation, so they are not represented as a pre-change test run.

## Controlled change

1. Raise only feature 003's run deadline to 60 seconds. Keep the W04 advisor's 85-second policy and the W05 six-attempt limit.
2. Retain a successful fallback model as the starting model for later steps of the same run. Advance only through the existing approved Flash → Flash-Lite → Gemma chain when eligible. Normalize an application-triggered attempt abort to timeout so a transport's cancellation error cannot prevent fallback; preserve actual caller cancellation as terminal.
3. Make safe user-facing failure messages distinguish deadline, provider unavailability, and unverified output. No raw provider response is displayed.
4. Update the current feature spec, plan, contracts, checklist and task notes. Preserve the verbatim original prompt and historical Evidence 014 without rewriting its 30-second baseline.

## Local tool timing check

`node --import tsx --input-type=module` measured 10,000 `evaluatePlan` runs on an existing valid small context: median **0.0094 ms**, p99 **0.0267 ms**, maximum **3.1163 ms**. `structuredClone` of the same context averaged **0.0066 ms** over 10,000 runs. This is a local synthetic check, not production latency. The implemented tools still enforce a 100 ms local budget and 8 KiB output limit.

## After verification

| Check | Actual result |
|---|---|
| `node --test tests/lifePlan.test.ts` after implementation | Exit 0, **35/35** tests passed before the additional Gemma-chain fixture was added. |
| `npm run typecheck` | Exit 0 after the final test/source changes. An earlier run caught an extra fake-test argument (TS2554); the test was corrected before the successful run. |
| `npm test` | Exit 0, typecheck plus **94/94** tests passed. New fixtures cover 60-second default/cap, primary timeout whose aborted transport reports cancellation, Flash-Lite reuse across four steps, Gemma completion after both Flash models fail, and the unchanged six-attempt run cap. |
| `npm run build` | Exit 0, Vite production build completed. |
| `npm run security:scan` | Exit 0, no known credential pattern or client secret reference found. |
| `npm run test:e2e` | Exit 0, **10/10** fake-provider/browser scenarios passed, including the W05 plan UI and W04 advisor regression. The startup-retry scenario belongs to separate Evidence 015 work. |
| Changed-document and feature relative link check | Exit 0, **193** links checked, **0** missing; six external/absolute links excluded. The first scan treated four existing absolute local source links as relative and reported false positives; the corrected scan excluded absolute paths. |
| `git diff --check` | Exit 0, no whitespace errors. |

The normal four-step life plan still executes three read-only tools. Provider failures, request cancellation, stale revisions, and invalid model output still stop safely. A timeout triggered by the run now remains eligible for the approved fallback even if the transport rejects its abort as `cancelled`.

## Limits

The original observed failure was not reproduced against a live provider. The code and fake-provider tests establish timeout/fallback behavior; they cannot establish account-specific model availability, quotas, or the exact cause of the user's earlier generic error. Separate Evidence 015 startup recovery work remains uncommitted and outside this change.
