# Evidence 017 — Life-plan player-facing copy

## Task and baseline

- **Request:** [copy change prompt v1](../../prompts/week5/CHANGE_PROMPT_LIFE_PLAN_COPY_V1.md); later user request supersedes the original feature 003 visible-disclaimer wording.
- **Starting state:** uncommitted W05 implementation and earlier unrelated working-tree changes preserved. The user observed the full success string with a repeated technical disclaimer and the five assumptions. Source inspection found the disclaimer in `server/ai/lifePlan.ts` and appended assumptions in `src/main.ts`; the pending label also says “bounded plan.” The response DTO validates assumptions separately.
- **Baseline check before editing:** `npm run test:e2e` exit 0, **10/10** fake-provider/browser scenarios passed. Its W05-UI case explicitly waited for `BOUNDED PROJECTION`, confirming that the old copy was rendered. This check does not claim the user's exact food counts were reproduced.

## Frozen eval scenarios

| ID | Scenario | Expected after change | Before | After |
|---|---|---|---|---|
| C1 | Normal completed plan in paused shop | Show chosen action and food-count comparison; no “bounded projection,” guarantee disclaimer or technical assumption list | User observed all unwanted text; baseline E2E waited for it | Pass — W05-UI checks action and food count, rejects technical phrases |
| C2 | Pending and incomplete plan | Use short game-facing status; incomplete state retains the 100-food limit and availability note, without the assumption list | Pending label says “bounded plan”; incomplete UI appends assumptions | Pass — pending copy changed; `src/main.ts` renders incomplete `result.message` without appended assumptions; existing incomplete unit case passed |
| C3 | Same validated response and state | Backend evidence/assumption fields remain validated and read-only; existing advisor and game state stay unchanged | Baseline E2E 10/10 passed | Pass — 94/94 tests and 10/10 browser scenarios, including stale suppression and W04 advisor |

## Controlled change — iteration 1

- **Reason:** the backend success message included a technical disclaimer, and the client appended every assumption. This produced the repetitive sentence observed by the user.
- **Change:** removed the success disclaimer and client-side assumption display; replaced pending copy. The structured assumptions and validation remain intact. Updated feature 003's visible-copy requirement and W05 browser assertion.
- **Out of scope:** model/provider behavior, projection math, purchase authority and game rules.

## After verification

- `npm run typecheck`: exit **0**.
- `npm test`: exit **0**, **94/94** passed.
- `npm run build`: exit **0**, Vite build completed.
- `npm run security:scan`: exit **0**, no known credential pattern or client secret reference found.
- First `npm run test:e2e` after the copy change: exit **1**. W05-UI passed, then W05-STALE expected the old `CHECKING` pending text and failed. Updated that assertion to the new pending copy.
- Repeated `npm run test:e2e`: exit **0**, **10/10** passed, including W05-UI, W05-STALE and existing shop advice cases.
- `git diff --check`: exit **0** after source changes. Final documentation/link checks recorded separately below.
- Final changed-Markdown scan: **19** files, **235** workspace-relative links, **0** missing (six external/absolute links excluded); `git diff --check` exit **0**. Repeated `npm run security:scan` after tracking edits also exited **0**.

## Limits

The user subsequently reported manually trying the application and that everything works. This is a user-reported browser acceptance of the exercised flow, not an agent-run provider test. Credentials remained server-runtime secrets; the agent did not inspect or use them. The automated browser cases use a fake provider and check presentation, stale-result suppression and local state.
