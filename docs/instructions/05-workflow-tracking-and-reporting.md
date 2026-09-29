# Workflow, Tracking, and Reporting

This workflow is required for every substantive implementation or project-review task. It keeps task history, evidence, and report facts in one place without mixing them into permanent project instructions.

## Where each kind of information belongs

| Artifact | Owns | Do not use it for |
|---|---|---|
| **Specification / task plan** in `docs/specs/` | Intended behavior, constraints, architecture/contracts, acceptance criteria, Definition of Done, planned verification commands and manual checks, and explicit out-of-scope items. A task plan may contain its task checklist. | Recording what actually happened or claiming a check passed before it ran. |
| **Versioned prompt artifact** in `docs/prompts/` | The exact AI task request: objective, scope/constraints, allowed files or directories, prioritized context references, required output/change, links to the governing spec/DoD, and verification instructions. Include stable ID/version. | Replacing the normative spec or silently changing an already-used prompt. |
| **Context manifest** in `tracking/CONTEXT_MANIFEST.md` | Stable map of actual repository sources, usual selection, priority, and default exclusions. | Claiming which sources were used in a particular task. |
| **Task evidence** in `tracking/evidence/EVIDENCE_NNN.md` | The reproducible task loop: baseline, frozen eval scenarios, one controlled change per iteration, the same scenarios/results before and after, actual command output, manual-check status, and honest limitations. | Permanent requirements or an AI conversation transcript. |
| **AI usage log** in `tracking/AI_USAGE_LOG.md` | Significant AI-assisted work: purpose, prompt version, relevant context, concise description of model contribution, human review/decision, and how the result was checked. Record meaningful iterations, including rejected output when it affected a decision. | Private chain-of-thought, full chat dumps, secrets, or test evidence duplicated verbatim. |
| **Work log** in `tracking/WORK_LOG.md` | Short chronological task record: goal, starting state, prompt/spec/evidence links, files/outcome, checks and status, limitations, and next step. | Detailed eval tables, full command logs, or a second copy of AI usage notes. |
| **Weekly report** in `tracking/reports/` | Audience-ready summary derived from verified evidence, AI usage, and work-log records. | New claims that cannot be traced to those records. |

### Required evidence loop for a controlled change

1. **Define before editing.** Put stable acceptance criteria, Definition of Done, constraints, and planned verification in the owning spec/task plan. Create a versioned prompt artifact using the [prompt template](../prompts/PROMPT_TEMPLATE.md), with exact scope, allowed files, source priority, and instructions that point to the spec. Start the evidence record from the [evidence template](../tracking/evidence/EVIDENCE_TEMPLATE.md).
2. **Capture the baseline.** Before the change, record the source/revision or clear working-tree state, relevant existing behavior, exact commands, actual outputs/exit codes, and manual checks. If a baseline cannot be run or was not preserved, state that plainly; never reconstruct it from a later run.
3. **Freeze explicit evals.** Write scenario IDs, inputs/steps, and expected outcomes before implementation. Include success, boundary, invalid/failure, and regression cases as appropriate. Keep definitions fixed while comparing a change; if requirements change, document a new eval version and why.
4. **Make one controlled change per iteration.** Describe the hypothesis and smallest scoped change. If another change is needed, record a new iteration rather than blending causes.
5. **Run the same evals after.** Execute the same frozen scenarios and applicable verification commands; record exact actual outputs and statuses. Mark new capabilities `N/A` at baseline, and distinguish automated results from manual observations. Do not turn a plan/checklist item into a pass without evidence.
6. **State limits honestly.** Record missing checks, unavailable baseline, environment blockers, known risks, and what the evidence does not establish (for example, mock tests do not establish live-provider quality).
7. **Link records, avoid duplication.** Evidence owns baseline/evals/results; AI usage owns the AI contribution/review trail; work log summarizes and links them; reports summarize verified records.

For historical work that predates this process, normalize the records without inventing missing data. Mark unavailable baseline or prompt fields as not captured and retain later results as after-only evidence.

## Start of task

1. Read `AGENTS.md`, [`../INSTRUCTIONS.md`](../INSTRUCTIONS.md), and only the topic modules relevant to the task.
2. Inspect the current working tree and preserve unrelated user changes.
3. Read the relevant specification, code, tests, and prior evidence. Separate authoritative project requirements from examples or course guidance.
4. Before a larger change, summarize the goal, scope, files, assumptions, checks, and out-of-scope work.
5. Add a short entry to [`../tracking/WORK_LOG.md`](../tracking/WORK_LOG.md): date, task/goal, acceptance checks, starting state or known blocker, links to the prompt/specification used, and links to the evidence used or created. If no standalone prompt exists or applies, say so instead of adding a misleading link. Do not overwrite earlier entries.

## During the task

- Make the smallest complete change that meets the accepted requirement. For a behavior change, use a clear acceptance scenario and focused test/eval; when practical, verify a failing test for the expected reason before implementation.
- Update the owning specification or instruction only if the accepted requirement or stable project rule changed. Do not duplicate a rule across multiple files; put details in the owning module and link to it.
- Keep `tracking/AI_USAGE_LOG.md` factual when AI assistance materially affects a project decision or implementation. Link the exact prompt version and evidence; record purpose, selected context, concise AI contribution, human review/decision, and verification. Never record private chain-of-thought or secrets.
- Keep evals task-specific inside their evidence record. Preserve the baseline/context needed to understand the task, freeze expectations before results, and report before/after outcomes using the same cases for each controlled iteration. Do not maintain a duplicate global eval file.
- Add or update the relevant `tracking/evidence/` record for milestone or acceptance claims. Include actual commands, outputs, the prompt/specification and task context used, known limitations, and links to related evidence.
- Use [`../tracking/CONTEXT_MANIFEST.md`](../tracking/CONTEXT_MANIFEST.md) as the stable map of actual repository sources, their usual selection, precedence, and default exclusions. It does not prove which files were used for a task.
- When context selection materially affects an AI task, record the task-specific context inline in its evidence or work-log entry: purpose, sources actually consulted/supplied and relevant sources excluded, priority on conflict, and relevant privacy/staleness risks.
- If blocked, record expected versus actual behavior, commands/files checked, last verified state, and the next precise question. Do not silently expand scope to work around a blocker.

## Finish and report

1. Inspect the final diff and working tree. Check that no unrelated files, secrets, or private data were added.
2. Run the required project checks in `04-testing-and-verification.md` for implementation changes. For doc-only work, record skipped checks and why.
3. Append the actual outcome to `tracking/WORK_LOG.md`: files changed, implementation decision, verification commands and results, evidence location, known limitations, and next step.
4. Update `tracking/AI_USAGE_LOG.md` or the task-specific evidence only where applicable; do not create empty or duplicate evidence files.
5. Give the user a concise handoff covering what changed, checks actually run, where evidence lives, what remains, and report-ready facts. Use `tracking/reports/REPORT_TEMPLATE.md` when preparing a weekly report. Do not invent contributions or send/publish reports unless explicitly asked.

## Records have distinct jobs

- **Work log:** chronological record of tasks and decisions.
- **AI usage log:** meaningful AI-assisted interactions and their verified outcomes.
- **Task evidence:** baseline, context, expected cases, actual results, and limitations for one milestone/change.
- **Weekly report:** audience-facing summary derived from the records above.

Do not copy the entire same narrative into every record. The work log links prompts/specs to task evidence; task evidence owns its evaluation and results. Link related entries and keep each record focused on its purpose.
