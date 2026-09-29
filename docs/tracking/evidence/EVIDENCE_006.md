# Evidence 006 — Powerups and perks specification package

## Record and task context

- **Purpose / accepted goal:** take the Week 4 powerups/perks prompt, clarify material behavior, and
  create the full pre-implementation Spec Kit package without changing gameplay.
- **Governing spec/task plan:** [Spec Kit feature specification](../../../specs/001-powerups-perks/spec.md)
  and [implementation plan](../../../specs/001-powerups-perks/plan.md).
- **Exact prompt artifact and version:** [Powerups and perks prompt v1](../../prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md).
- **Starting source/revision or working-tree state:** branch `main`, ahead of `origin/main` by two
  commits. `docs/tracking/AI_USAGE_LOG.md` and `docs/tracking/WORK_LOG.md` were already modified and the
  v1 prompt was untracked. Those user changes were preserved. Spec Kit CLI 1.0.10 was installed but
  the repository had no `.specify/`, `.agents/skills/speckit-*`, or numbered feature directory.
- **Sources actually used:** `AGENTS.md`; `docs/INSTRUCTIONS.md`; instruction modules 01, 02, 04, and
  05; `docs/specs/GAME_SPEC.md`, `REFACTOR_PLAN.md`, and `TOOL_CONTRACT.md`; prompt/evidence templates;
  context manifest; existing server, protocol, client, engine, configuration, UI, styles, package
  scripts, and tests; the project-local Spec Kit constitution/specify/clarify/plan/checklist/tasks/
  analyze skill instructions and resolved templates.
- **Relevant sources excluded and why:** course downloads and unrelated Week 3 prompts/evidence were
  not needed for the feature design; generated `dist/`, dependencies, credentials, external services,
  and live providers were excluded.
- **Conflict priority and risks:** current user request and the feature prompt authorize levels,
  powerups, and lives, superseding the current `GAME_SPEC.md` exclusion. Implementation task T001
  must reconcile that owning spec before source changes. Suggested prompt values were made explicit
  in the feature assumptions. No secret/private data or external service was used.
- **Scope / out of scope:** specification, clarification, design, contracts, checklist, tasks,
  analysis, and tracking only. No server, client, game, style, API, or test implementation.

## Baseline

The new capability is absent, so feature cases P1–P5 are `N/A — capability absent`, not passes. The
existing implementation baseline was captured after documentation generation but before any behavior
code change; documentation cannot affect the executable result.

| Command | Actual result |
|---|---|
| `npm run typecheck` | Exit 0; `tsc -p tsconfig.json --noEmit` produced no diagnostics. |
| `npm test` | Exit 0; 26 tests, 26 passed, 0 failed/skipped/todo; duration `343.878385ms`. |
| `npm run build` | Exit 0; Vite 6.4.3 transformed 8 modules and built `dist/` in 272 ms. |
| `git diff --check` | Exit 0; no output. Note: Git does not inspect untracked files with this command. |

The 26 passing baseline covers the existing strict snapshot case, session/container lifecycle,
server timing, pause/restart, request errors, WebSocket snapshots, seven read-only Hint cases, runtime
config, and core Snake movement/food/collision rules. It does not cover the proposed feature.

## Frozen eval scenarios and before/after results

These expectations were frozen before feature implementation. Detailed runnable steps are in the
[quickstart](../../../specs/001-powerups-perks/quickstart.md).

| ID | Scenario / input | Expected result | Pre-implementation baseline | After planning iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| P1 | XP boundaries, Extra XP, Double Food ordering, multi-level award, restart | Exact XP/score/growth/level/points and complete run reset | N/A — capability absent | N/A — not implemented | Quickstart Q1; Spec US1/SC-001 |
| P2 | S/SHOP pause flow; valid, malformed, wrong-status, unaffordable, capped purchases | Exact atomic purchase or typed no-mutation rejection; accessible resume flow | N/A — capability absent | N/A — not implemented | Quickstart Q2; Spec US2/SC-002–003 |
| P3 | Controlled Luck roll/type/cell; each effect; pause/refresh/expiry; near-full board | Exact chance/cell/effect behavior and no invalid occupancy | N/A — capability absent | N/A — not implemented | Quickstart Q3; Spec US3/SC-004–005 |
| P4 | Wall/self collision with none, Shield, life, and both | Correct precedence, one consumption, safe cancellation/respawn, retained run values | N/A — capability absent | N/A — not implemented | Quickstart Q4; Spec US4/SC-006 |
| P5 | Missing/extra/range/inconsistent snapshot and Hint/container regressions | Invalid state rejected wholly; last valid view and Hint boundary preserved | Feature shape N/A; existing regressions pass | Feature shape N/A; existing 26/26 pass | Quickstart Q5; SC-007–008 |
| D1 | Spec Kit artifact completeness and internal consistency | Constitution, spec, quality checks, research, model, contract, quickstart, tasks, and read-only analysis contain no unresolved blocker | Artifacts absent | Pass | 30 FRs, 8 SCs, 43 valid tasks, 100% mapped coverage |

## Controlled change — iteration 1

- **Hypothesis / reason:** resolving suggested values and edge semantics before implementation will
  prevent rule, API, timer, and UI decisions from being improvised across server/client code.
- **Single bounded change:** initialized Spec Kit 1.0.10 for the existing repository and created one
  complete `001-powerups-perks` specification/planning package plus repository tracking updates.
- **Files changed:** `.specify/` project scaffold and constitution; `.agents/skills/speckit-*` local
  workflow skills; `specs/001-powerups-perks/` artifacts; this evidence; work/AI usage logs; docs index
  and context manifest. The existing v1 prompt remains the source input.
- **Out of scope preserved:** no application source, UI markup/style, API, test, dependency, package,
  build configuration, Hint contract, or gameplay behavior was modified.

## After verification

Automated executable baseline checks are recorded above. Final documentation checks all exited 0:

- Spec Kit prerequisite discovery found the active feature directory plus `research.md`,
  `data-model.md`, `contracts/`, `quickstart.md`, and `tasks.md`.
- Placeholder scan found no unresolved placeholder outside the built-in checklist's intentional
  “No `[NEEDS CLARIFICATION]` markers remain” wording.
- Task validation reported `tasks=43 bad=0`; the spec contains 30 FRs and 8 SCs.
- Relative Markdown-link scan reported `All relative Markdown links resolve across 16 files.`
- Trailing-whitespace scan returned no matches; final `git diff --check` exited 0 with no output.

Manual gameplay checks were not run because no gameplay was implemented. Spec Kit analyze was
strictly read-only and reported zero findings, 38/38 requirement/outcome coverage, 43 tasks, and no
constitution conflict.

## Honest limitations

- The feature remains entirely unimplemented; all P1–P5 feature outcomes remain N/A.
- The prompt's suggested one-item/equal-odds/life-price values were adopted as v1 assumptions and may
  be amended before implementation through the spec workflow.
- No browser/manual gameplay evidence exists for the feature. Random visual effects cannot be claimed
  from the current game.
- The custom 27-item feature-quality checklist is intentionally unchecked and reviewer-owned; the
  completed 16-item built-in checklist records agent self-validation of spec quality only.
- The constitution Sync Impact Report remains as temporary review material until a human chooses to
  commit the initial constitution.
- During final review, `AGENTS.md` and `docs/instructions/03-ai-hint-and-security.md` changed
  concurrently to authorize a separately scoped server-side Gemini iteration. Those external changes
  were preserved; the constitution was reconciled to the updated narrow Hint boundary, while this
  powerups feature continues to make no provider change. The newly referenced Gemini spec and hook
  were not present when checked and are outside this task.
- `git diff --check` does not evaluate untracked files, so final link/whitespace scans are also
  required and recorded separately.
