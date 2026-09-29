# Workflow, Tracking, and Reporting

This workflow is required for every substantive implementation or project-review task. It keeps task history, evidence, and report facts in one place without mixing them into permanent project instructions.

## Start of task

1. Read `AGENTS.md`, [`../INSTRUCTIONS.md`](../INSTRUCTIONS.md), and only the topic modules relevant to the task.
2. Inspect the current working tree and preserve unrelated user changes.
3. Read the relevant specification, code, tests, and prior evidence. Separate authoritative project requirements from examples or course guidance.
4. Before a larger change, summarize the goal, scope, files, assumptions, checks, and out-of-scope work.
5. Add a short entry to [`../tracking/WORK_LOG.md`](../tracking/WORK_LOG.md): date, task/goal, acceptance checks, starting state or known blocker, links to the prompt/specification used, and links to the evidence used or created. If no standalone prompt exists or applies, say so instead of adding a misleading link. Do not overwrite earlier entries.

## During the task

- Make the smallest complete change that meets the accepted requirement. For a behavior change, use a clear acceptance scenario and focused test/eval; when practical, verify a failing test for the expected reason before implementation.
- Update the owning specification or instruction only if the accepted requirement or stable project rule changed. Do not duplicate a rule across multiple files; put details in the owning module and link to it.
- Keep `tracking/AI_USAGE_LOG.md` factual when AI assistance materially affects a project decision or implementation. Record purpose, relevant context, result, decision, and verification; never record private chain-of-thought or secrets.
- Keep evals task-specific inside their evidence record. Preserve the baseline/context needed to understand the task, state expectations before results, and report before/after outcomes using the same cases. Do not maintain a duplicate global eval file.
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
