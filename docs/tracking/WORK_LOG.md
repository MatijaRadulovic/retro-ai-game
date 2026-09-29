# Work Log

Append one concise entry for each substantive implementation, review, or documentation task. Every entry links the prompt/specification that guided the work and the evidence used or created. If there was no standalone prompt artifact, say so. Keep results factual and do not rewrite history.

## 2026-09-20 to 2026-09-23 — Snake core and local AI Hint milestones

- **Goal:** build the scoped Snake game, preserve a core baseline, then add one controlled read-only local Hint flow.
- **Prompt/spec references:** [Initial build prompt](../prompts/BUILD_PROMPT_V1.md), [mock Hint prompt](../prompts/BUILD_PROMPT_HINTS-MOCK.md), [game specification](../specs/GAME_SPEC.md), [tool contract](../specs/TOOL_CONTRACT.md).
- **Task context:** task-specific included/excluded sources, priority, and risks are recorded in [Evidence 003](evidence/EVIDENCE_003.md); no live provider, network, credentials, or unrelated project code were in scope.
- **Evidence:** [Evidence 003 — baseline, core evals, controlled change, and command outputs](evidence/EVIDENCE_003.md); [Evidence 004 — Hint success, negative, read-only, and failure cases](evidence/EVIDENCE_004.md).
- **Recorded outcome:** baseline test output was 9/9 passing; after the Hint change the recorded test output was 16/16 passing, with typecheck and build outputs in Evidence 003.
- **Limitations:** the model is a local fake/mock; these records do not establish live-provider or real-LLM quality.

## 2026-09-29 — Organize project instructions and tracking records

- **Goal:** replace the crowded root guidance and scattered Markdown files with a concise `AGENTS.md`, routed topic instructions, and organized specifications, prompts, and tracking records.
- **Prompt/spec references:** no standalone build prompt applied to this documentation-only reorganization; followed the user's request, [`AGENTS.md`](../../AGENTS.md), and the existing [instruction index](../INSTRUCTIONS.md).
- **Evidence used:** existing [Evidence 003](evidence/EVIDENCE_003.md), [Evidence 004](evidence/EVIDENCE_004.md), and [Week 3 review checklist](checklists/WEEK03_EXERCISE_REVIEW.md).
- **Outcome:** added the instruction index and topic modules; grouped specs, prompts, and tracking records; preserved the audit checklist; removed the redundant general guidance note.
- **Verification:** relative Markdown link scan passed. Code checks were skipped because no implementation changed.
- **Limitations:** no game behavior was changed or re-audited.

## 2026-09-29 — Consolidate context, baseline, and eval records

- **Goal:** remove standalone context-manifest, baseline, and global eval files while preserving the required information in task-specific records.
- **Prompt/spec references:** no standalone implementation prompt applied; consulted [project instructions](../INSTRUCTIONS.md), [initial build prompt](../prompts/BUILD_PROMPT_V1.md), [mock Hint prompt](../prompts/BUILD_PROMPT_HINTS-MOCK.md), [game specification](../specs/GAME_SPEC.md), and [tool contract](../specs/TOOL_CONTRACT.md).
- **Evidence used/updated:** [Evidence 003](evidence/EVIDENCE_003.md) now contains the baseline, context record, core eval cases, and verification output; [Evidence 004](evidence/EVIDENCE_004.md) contains the Hint-specific evals and outcomes.
- **Outcome:** removed the standalone context manifest, global eval file, and separate baseline file. Evidence 003 now owns the core baseline, task context, core eval cases, and command outputs; Evidence 004 owns Hint-specific evals. Work-log entries now link prompts/specs and evidence.
- **Verification:** Python 3 Markdown link scan passed (`All relative Markdown links resolve.`); stale-path search found no references to the removed files. Code checks were skipped because this was documentation-only.
- **Limitations:** the course context-manifest content is preserved inline in Evidence 003; no standalone `CONTEXT_MANIFEST.md` remains.

## 2026-09-29 — Extract Week 4 assignment and reliability guidance

- **Goal:** create a Week 4 checklist and detailed task guide from the supplied assignment, session material, AI API addendum, and provider-reliability addendum.
- **Prompt/spec references:** no separate implementation prompt applies; project boundary references are [game spec](../specs/GAME_SPEC.md), [tool contract](../specs/TOOL_CONTRACT.md), and [mock Hint prompt](../prompts/BUILD_PROMPT_HINTS-MOCK.md).
- **Course sources reviewed:** [W04 assignment](</home/matija/Downloads/SITA_AI_Bootcamp_2026_W04_Assignment_Reliable_AI_Integration.md>), [provider errors and fallback](</home/matija/Downloads/week-04-provider-errors-reliability-and-fallback.md>), [AI API integration addendum](</home/matija/Downloads/week-04-ai-api-integration-addendum.md>), [W04 Session 1 material](</home/matija/Downloads/week-03-week-04-materials-package/week-03-week-04-pdf-review/materijali-za-studente/week-04-session-01-session-material.md>).
- **Evidence created:** [Week 4 checklist](checklists/WEEK04_RELIABLE_AI_INTEGRATION_CHECKLIST.md) and [detailed task guide](checklists/WEEK04_RELIABLE_AI_INTEGRATION_GUIDE.md).
- **Outcome:** extracted scenario design, contracts, trust boundaries, runtime/schema/semantic validation, error classification, retry versus fallback, offline fake testing, privacy, evidence, demo, rubric, and stretch boundaries. Live provider/backend requirements are labeled course-specific and out of scope under the current project contract.
- **Verification:** Python 3 link scan passed (`All relative and absolute local Markdown links resolve.`). Code checks were skipped because this was documentation-only.
- **Limitations:** checklist statuses are pending; the current implementation has not been re-audited.

## 2026-09-29 — Restore repository context manifest

- **Goal:** provide a repository-level map of actual context files, their usual inclusion, source priority, and default exclusions.
- **Prompt/spec references:** no standalone prompt artifact applies; followed the user's request, [`AGENTS.md`](../../AGENTS.md), the [instruction index](../INSTRUCTIONS.md), and the [workflow guidance](../instructions/05-workflow-tracking-and-reporting.md).
- **Evidence used/updated:** reviewed the current repository file list and existing project guidance; created [context manifest](CONTEXT_MANIFEST.md) and linked it from the [instruction index](../INSTRUCTIONS.md).
- **Outcome:** restored the manifest while distinguishing stable repository mapping from task-specific context records. Updated workflow guidance so actual sources used/excluded remain recorded per task.
- **Verification:** Python 3 Markdown link scan passed (`All relative Markdown links resolve.`); `git diff --check` passed. Code checks skipped because this was documentation-only.
- **Limitations:** a listed source is not evidence it was included or reviewed for a particular task.
