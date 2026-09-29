# Work Log

Append one concise entry for each substantive implementation, review, or documentation task. Every entry links the prompt/specification that guided the work and the evidence used or created. If there was no standalone prompt artifact, say so. Keep results factual and do not rewrite history.

## 2026-09-29 — Plan Gemini Hint security and reliability

- **Goal:** replace the mock-only Hint scope with an explicitly bounded server-side Gemini design; document secret-handling rules and install a push-time leak/exposure guard.
- **Prompt/spec references:** [Gemini Hint build prompt v1](../prompts/week4/BUILD_PROMPT_GEMINI_HINT_V1.md) and [Gemini integration plan](../specs/GEMINI_HINT_INTEGRATION.md). Read both supplied Week 4 API/reliability addenda as reference; their multi-provider, OpenAI, Gemma, and unrelated replay examples remain out of scope.
- **Starting state:** HEAD `091fe25`; existing user changes to powerups/Spec Kit records were preserved. The browser used the local fake Hint; Vite had no `define` injection; source search found no Gemini or Vite secret references. Secret files were not opened.
- **Outcome:** revised `AGENTS.md`, AI security rules, game/tool specs, and Week 4 guide/checklist scope note; set one Gemini-only design with an 8-second total budget, two attempts maximum, transient-only retry, and a local fallback; added the build prompt and Evidence 007. Added a dependency-free pre-push scanner and configured `.githooks/pre-push` in this checkout.
- **Verification:** `npm run security:scan` passed; simulated push scan passed across 8 locally reachable commits; synthetic credential and committed `.env` fixtures were rejected without printing/reading their values; `git diff --check` passed. Typecheck/tests/build skipped because no game code changed.
- **Limitations/next step:** no Gemini endpoint, SDK, live request, or actual credential exists yet. The scanner detects known formats and explicit client references; it cannot prove absence of unknown credential formats or compare an unknown key. Implement the approved prompt next; a fresh checkout must enable hooks with `git config core.hooksPath .githooks`.

## 2026-09-29 — Specify powerups and perks with Spec Kit

- **Goal:** clarify the Week 4 powerups/perks prompt and create an implementation-ready Spec Kit artifact set without changing game behavior.
- **Prompt/spec references:** [Powerups and perks prompt v1](../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md), [clarified feature spec](../../specs/001-powerups-perks/spec.md), and [implementation plan](../../specs/001-powerups-perks/plan.md).
- **Task context:** current user request, `AGENTS.md`, project instructions, game/tool specifications, server-authoritative source, tests, and tracking templates. Existing modified and untracked user files were preserved; later concurrent Gemini Hint guidance changes were also preserved and only the new constitution wording was reconciled to them.
- **Evidence:** [Evidence 006](evidence/EVIDENCE_006.md) owns the pre-implementation baseline, frozen Q1–Q5 scenarios, artifact checks, and limitations.
- **Starting state:** Spec Kit CLI 1.0.10 is installed, but this repository has no `.specify/` project scaffold or numbered feature directory. The prompt exists as an untracked file and contains suggested values and underspecified edge cases that require explicit decisions before implementation.
- **Outcome:** initialized Spec Kit with the Codex integration; created constitution v1.0.0 and the complete `specs/001-powerups-perks/` package: clarified spec, built-in and reviewer-owned checklists, research, implementation plan, data model, game API contract, quickstart acceptance guide, and 43 dependency-ordered tasks. Clarification resolved progression math, spawn/timing/stacking, life pricing, collision precedence, respawn, food priority, shop/touch behavior, and safe failures. Read-only analysis found 38/38 requirements/outcomes covered with no findings.
- **Verification:** `npm run typecheck` passed; `npm test` passed 26/26; `npm run build` passed; `git diff --check` passed. Spec Kit prerequisite discovery, task format/count, placeholder/trailing-whitespace, and Markdown-link checks are recorded in Evidence 006. These executable checks establish the unchanged baseline, not the unimplemented feature.
- **Files changed:** Spec Kit scaffold/workflow skills and constitution; `specs/001-powerups-perks/`; docs index/context manifest; Evidence 006; work/AI usage logs. No application source, tests, package, or Hint contract changed.
- **Out of scope:** no gameplay, server, client, API, styling, or test implementation in this specification/planning task.
- **Limitations/next step:** feature scenarios remain N/A until implementation. A reviewer should evaluate the unchecked 27-item custom requirements checklist, then implementation starts with task T001 to reconcile `GAME_SPEC.md` before any behavior code.

## 2026-09-29 — Draft Week 4 powerups and perks implementation prompt

- **Goal:** capture the user's accepted run-based XP, powerup, perk, shop, and life decisions in a versioned implementation prompt.
- **Prompt/spec references:** created [Powerups and perks prompt v1](../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md) using the [prompt template](../prompts/PROMPT_TEMPLATE.md); linked the current [game spec](../specs/GAME_SPEC.md) and relevant project instructions as implementation context.
- **Outcome:** documented the three pickups, three perks, proposed balance values, server-authoritative behavior, S-key pause/shop flow, plus-only purchases, two-life cap, acceptance criteria, allowed files, and verification commands. The game spec is to be updated by the implementation task before code changes.
- **Verification:** `git diff --check` passed; all relative links in the new prompt resolve. Code checks were not run because no implementation changed.
- **Limitations/next step:** proposed balance values remain tunable. Use this prompt to guide a separately evidenced implementation task.

## 2026-09-29 — Server-authoritative single-player refactor

- **Goal:** preserve current Snake gameplay while moving authority to a TypeScript Node backend, with multiple independent in-memory single-player containers and a path to extend player/session state later.
- **Prompt/spec references:** [Server refactor prompt](../prompts/week4/BUILD_PROMPT_SERVER_REFACTOR.md), [refactor plan](../specs/REFACTOR_PLAN.md), [game specification](../specs/GAME_SPEC.md), and [Hint tool contract](../specs/TOOL_CONTRACT.md).
- **Task context:** consulted the source, current implementation, tests, and instructions in `docs/INSTRUCTIONS.md`; current user request and clarification supersede the prior browser-only/backend prohibition. Existing unrelated working-tree changes are being preserved.
- **Evidence:** [Evidence 005](evidence/EVIDENCE_005.md) owns acceptance scenarios, command output, and limitations for this refactor.
- **Starting state:** existing browser-only implementation; repository contained pre-existing modified, deleted, and untracked documentation files. Core test history is recorded in [Evidence 003](evidence/EVIDENCE_003.md), and Hint cases in [Evidence 004](evidence/EVIDENCE_004.md).
- **Outcome:** added Node HTTP endpoints for game creation/read and direction, pause, resume, and restart actions; WebSocket sends versioned authoritative snapshots. The browser now submits actions and renders validated snapshots; local Hint remains sanitized and read-only. Added multiple isolated in-memory containers, one player per container, and no room/join or multiplayer flow. Added a detailed checked plan, implementation prompt, updated project contract, and task evidence.
- **Files changed:** server manager/API/entrypoint; shared snapshot protocol and browser API/render flow; Vite proxy, package scripts/dependencies, tests, README, game spec, architecture guidance, work log, AI usage log, and Evidence 005.
- **Verification:** `npm run typecheck` passed; `npm test` passed 26/26; `npm run build` passed; `git diff --check` and focused Markdown link scan passed. Vite proxied `/api/health` and returned HTTP 200. The user later reported a successful manual check; see [Evidence 005](evidence/EVIDENCE_005.md).
- **Limitations/next step:** sessions are in memory and disappear at server restart. Each container has one player and there is no room/join endpoint. The user reported manual success but did not provide individual scenarios.

## 2026-09-29 — Document build and local run steps

- **Goal:** explain development startup and how to build and preview the client with the API server running.
- **Prompt/spec references:** user request; [`README.md`](../../README.md), [`vite.config.ts`](../../vite.config.ts), and the package scripts in [`package.json`](../../package.json).
- **Outcome:** added development and build/preview steps to the README and verification instructions; configured Vite preview to proxy API and WebSocket requests to the local TypeScript backend.
- **Verification:** `npm run typecheck` passed; `npm test` passed 26/26; `npm run build` passed; built preview `/api/health` returned HTTP 200 through the preview proxy; `git diff --check` passed. Details are in [Evidence 005](evidence/EVIDENCE_005.md).

## 2026-09-20 to 2026-09-23 — Snake core and local AI Hint milestones

- **Goal:** build the scoped Snake game, preserve a core baseline, then add one controlled read-only local Hint flow.
- **Prompt/spec references:** [Initial build prompt](../prompts/week3/BUILD_PROMPT_V1.md), [mock Hint prompt](../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md), [game specification](../specs/GAME_SPEC.md), [tool contract](../specs/TOOL_CONTRACT.md).
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
- **Prompt/spec references:** no standalone implementation prompt applied; consulted [project instructions](../INSTRUCTIONS.md), [initial build prompt](../prompts/week3/BUILD_PROMPT_V1.md), [mock Hint prompt](../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md), [game specification](../specs/GAME_SPEC.md), and [tool contract](../specs/TOOL_CONTRACT.md).
- **Evidence used/updated:** [Evidence 003](evidence/EVIDENCE_003.md) now contains the baseline, context record, core eval cases, and verification output; [Evidence 004](evidence/EVIDENCE_004.md) contains the Hint-specific evals and outcomes.
- **Outcome:** removed the standalone context manifest, global eval file, and separate baseline file. Evidence 003 now owns the core baseline, task context, core eval cases, and command outputs; Evidence 004 owns Hint-specific evals. Work-log entries now link prompts/specs and evidence.
- **Verification:** Python 3 Markdown link scan passed (`All relative Markdown links resolve.`); stale-path search found no references to the removed files. Code checks were skipped because this was documentation-only.
- **Limitations:** the course context-manifest content is preserved inline in Evidence 003; no standalone `CONTEXT_MANIFEST.md` remains.

## 2026-09-29 — Extract Week 4 assignment and reliability guidance

- **Goal:** create a Week 4 checklist and detailed task guide from the supplied assignment, session material, AI API addendum, and provider-reliability addendum.
- **Prompt/spec references:** no separate implementation prompt applies; project boundary references are [game spec](../specs/GAME_SPEC.md), [tool contract](../specs/TOOL_CONTRACT.md), and [mock Hint prompt](../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md).
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

## 2026-09-29 — Standardize evidence and tracking workflow

- **Goal:** make Evidence 003–005 follow one controlled-change structure and clarify where specifications, prompts, evidence, AI usage, and work-log facts belong.
- **Prompt/spec references:** no standalone prompt artifact applied; followed the user's request, [workflow guidance](../instructions/05-workflow-tracking-and-reporting.md), [testing guidance](../instructions/04-testing-and-verification.md), and relevant [specs](../specs/).
- **Evidence used/updated:** reorganized [Evidence 003](evidence/EVIDENCE_003.md), [Evidence 004](evidence/EVIDENCE_004.md), and [Evidence 005](evidence/EVIDENCE_005.md); historical missing baseline details in Evidence 005 remain explicitly unrecorded.
- **Outcome:** standardized record/context, baseline, frozen eval scenarios, controlled change, after-verification, and limitations. Added [prompt](../prompts/PROMPT_TEMPLATE.md) and [evidence](evidence/EVIDENCE_TEMPLATE.md) templates, defined record ownership and the same-before/after eval rule in workflow guidance, and clarified the testing guide. Normalized the AI usage log while marking uncaptured historical prompt/review details.
- **Verification:** Python 3 Markdown link scan passed (`All relative Markdown links resolve.`); no trailing whitespace found; `git diff --check` passed. Code checks skipped because this was documentation-only.
- **Limitations:** historical E005 has no immediate pre-refactor test output or immutable source revision; E005 therefore reports after-only checks for new server capabilities. Older prompt artifacts remain historical and do not retroactively meet the new template.

## 2026-09-29 — Simplify prompt template

- **Goal:** keep prompt versioning minimal and separate prompt-writing guidance from evidence/reporting requirements.
- **Prompt/spec references:** no standalone prompt artifact applies; followed the user's clarification and the [tracking workflow](../instructions/05-workflow-tracking-and-reporting.md).
- **Evidence used/updated:** simplified [prompt template](../prompts/PROMPT_TEMPLATE.md); evidence and reporting requirements remain in the [evidence template](evidence/EVIDENCE_TEMPLATE.md) and workflow.
- **Outcome:** reduced prompt metadata to a single version label (`v1`, incrementing on revision); retained goal, context priority, scope/constraints, allowed files, acceptance criteria, and verification guidance; removed evidence/reporting fields.
- **Verification:** Python 3 Markdown link scan passed (`All relative Markdown links resolve.`); no trailing whitespace found; `git diff --check` passed. Code checks skipped because this was documentation-only.
- **Limitations:** no historical prompt artifacts were rewritten or retroactively versioned.
