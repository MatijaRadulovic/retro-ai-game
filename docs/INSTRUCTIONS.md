# RETRO SNAKE Instruction Index

Use this index to load only the project guidance relevant to the task. `AGENTS.md` is the short, always-on contract; these modules add focused detail. Project specifications define intended product behavior, while tracking files record work and evidence.

## Instruction modules

1. [Project architecture and game rules](instructions/01-project-architecture.md) — state ownership, rendering, game scope, and runtime configuration.
2. [Code conventions](instructions/02-code-conventions.md) — TypeScript, Vite, DOM/CSS, dependencies, and change scope.
3. [AI Hint and security](instructions/03-ai-hint-and-security.md) — the sole permitted tool flow, trust boundaries, privacy, and safe failure.
4. [Testing and verification](instructions/04-testing-and-verification.md) — test expectations, commands, evidence, and honest reporting.
5. [Workflow, tracking, and reporting](instructions/05-workflow-tracking-and-reporting.md) — task intake, work log, evidence updates, and report-ready handoff.

## Routing

| Task | Read |
|---|---|
| Game rules, state transitions, rendering, configuration | 01, 02, 04; `specs/BASE_GAME_SPEC.md` and the relevant accepted feature spec |
| AI Hint, tool contract, model-simulator behavior | 03, 04; `specs/TOOL_CONTRACT.md`, `prompts/week3/BUILD_PROMPT_FINAL_VERSION.md` |
| Tests, evals, failure investigation | 04, 05; relevant files under `tracking/` |
| Documentation, project instructions, task handoff | 05 and the relevant source/spec |
| Any larger or cross-cutting change | 01–05 as relevant; summarize the plan before editing |

## Project source of truth

The precedence for product behavior is: current user request → `AGENTS.md` project contract → `specs/BASE_GAME_SPEC.md` plus any accepted feature spec → `specs/TOOL_CONTRACT.md` and accepted prompt → implementation and tests → runtime input. Course handouts and review notes are references; they do not expand project scope.

## Repository documentation map

| Area | Location | Purpose |
|---|---|---|
| Base game specification | [`specs/BASE_GAME_SPEC.md`](specs/BASE_GAME_SPEC.md) | Existing core rules, configuration, Definition of Done, and base-game scope |
| XP, perks, and Lucky pickup feature | [`../specs/001-powerups-perks/`](../specs/001-powerups-perks/) | Phase 1 requirements, plan, data model, API contract, quickstart, and tasks; see Evidence 006–007 for implementation status |
| Server refactor plan | [`specs/REFACTOR_PLAN.md`](specs/REFACTOR_PLAN.md) | Accepted client/server architecture, task checklist, and validation record |
| AI tool contract | [`specs/TOOL_CONTRACT.md`](specs/TOOL_CONTRACT.md) | Allowed `get_game_state` tool, data shape, and failure policy |
| Build prompts and template | [`prompts/`](prompts/) | Versioned task prompts; use [`prompts/PROMPT_TEMPLATE.md`](prompts/PROMPT_TEMPLATE.md) for new artifacts |
| Work log | [`tracking/WORK_LOG.md`](tracking/WORK_LOG.md) | Chronological work, decisions, checks, and next steps |
| Context manifest | [`tracking/CONTEXT_MANIFEST.md`](tracking/CONTEXT_MANIFEST.md) | Actual repository source map, task selection guidance, source priority, and default exclusions |
| AI usage log | [`tracking/AI_USAGE_LOG.md`](tracking/AI_USAGE_LOG.md) | Significant AI-assisted decisions; no private chain-of-thought |
| Core baseline and regression evals | [`tracking/evidence/EVIDENCE_003.md`](tracking/evidence/EVIDENCE_003.md) | Session 003 baseline and frozen core scenarios reused by the Hint change |
| Hint controlled-change evidence | [`tracking/evidence/EVIDENCE_004.md`](tracking/evidence/EVIDENCE_004.md) | Hint baseline status, core regressions, positive/negative/failure evals, and limitations |
| Server refactor evidence | [`tracking/evidence/EVIDENCE_005.md`](tracking/evidence/EVIDENCE_005.md) | Server refactor scenarios, after results, and explicit missing pre-run limitation |
| XP/perks planning evidence | [`tracking/evidence/EVIDENCE_006.md`](tracking/evidence/EVIDENCE_006.md) | Phase 1 scope, frozen scenarios, documentation checks, and implementation status |
| Luck/Lucky pickup evidence | [`tracking/evidence/EVIDENCE_007.md`](tracking/evidence/EVIDENCE_007.md) | Luck perk, orange pickup, deterministic spawn/reward cases, and implementation checks |
| Evidence template | [`tracking/evidence/EVIDENCE_TEMPLATE.md`](tracking/evidence/EVIDENCE_TEMPLATE.md) | Reusable record format for baseline, frozen evals, controlled iterations, actual checks, and limitations |
| Future task evidence | [`tracking/evidence/`](tracking/evidence/) | Use the common baseline → frozen evals → controlled iteration → same before/after evals → limitations structure |
| Exercise review | [`tracking/checklists/WEEK03_EXERCISE_REVIEW.md`](tracking/checklists/WEEK03_EXERCISE_REVIEW.md) | Week 3 audit checklist; items remain pending until checked |
| Week 4 checklist | [`tracking/checklists/WEEK04_RELIABLE_AI_INTEGRATION_CHECKLIST.md`](tracking/checklists/WEEK04_RELIABLE_AI_INTEGRATION_CHECKLIST.md) | Project-adapted Week 4 acceptance checklist |
| Week 4 task guide | [`tracking/checklists/WEEK04_RELIABLE_AI_INTEGRATION_GUIDE.md`](tracking/checklists/WEEK04_RELIABLE_AI_INTEGRATION_GUIDE.md) | Detailed course extraction, project mapping, work plan, and evidence instructions |
| Weekly reports | [`tracking/reports/`](tracking/reports/) | Existing report and reusable report template |
| Detailed instructions | [`instructions/`](instructions/) | Focused agent guidance by subject |

Update the smallest owning file when a rule changes. Keep evidence and activity records separate from specifications and permanent instructions. Use the workflow guide to keep spec, prompt, evidence, AI usage, work log, and report responsibilities distinct. Evals and task-specific context notes belong inside task evidence; the context manifest is only a stable map of repository sources and does not replace those records.
