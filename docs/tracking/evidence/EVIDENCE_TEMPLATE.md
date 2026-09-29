# Evidence NNN — <task or milestone>

Use one evidence file per substantive milestone or controlled change. Preserve the historical facts; mark anything that was not captured as **not recorded**. Never infer a baseline from a later result.

## Record and task context

- **Purpose / accepted goal:**
- **Governing spec/task plan:**
- **Exact prompt artifact and version:**
- **Starting source/revision or working-tree state:**
- **Sources actually used:**
- **Relevant sources excluded and why:**
- **Conflict priority and risks:**
- **Scope / out of scope:**

## Baseline

Record the behavior and state before editing. Include exact verification commands, actual outputs/exit statuses, and manual observations. If a check cannot be run, give the reason. For a new capability, mark its baseline cases `N/A — capability absent`; do not call them passing. If the baseline was not captured, say so.

## Frozen eval scenarios and before/after results

Write each scenario and expected result before changing code. Keep IDs and expectations fixed for the comparison. Include relevant success, boundary, invalid/failure, and regression cases.

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| E1 | | | | | |

If multiple controlled iterations are necessary, add a result column for each iteration and a separate iteration section below. Do not combine multiple changes into one iteration result.

## Controlled change — iteration 1

- **Hypothesis / reason:**
- **Single bounded change:**
- **Files changed:**
- **Out of scope preserved:**

## After verification

Record the same frozen evals after the change and the exact applicable project commands with actual output and exit status. Separate automated test results from manual observations. Include skipped checks and reasons. Link artifacts such as screenshots/logs only when they exist and are safe to share.

## Honest limitations

State missing baselines, unrun checks, environment blockers, known defects, and what the evidence does not establish. For example, a deterministic mock test does not establish live-provider quality.

## Iteration 2 (copy only if needed)

- **Hypothesis / reason:**
- **Single bounded change:**
- **Files changed:**
- **Frozen eval results:** reuse the same scenarios and add the iteration's outcome in the table above.
- **Verification:** record actual commands/results under a dated subsection above.
- **New or remaining limitations:**
