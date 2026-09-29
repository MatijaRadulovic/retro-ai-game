# Week 3 Exercise Notes and RETRO SNAKE Review Checklist

This document summarizes the supplied Week 3 Session 1 material and weekly assignment. It also turns the exercise into a checklist for reviewing the existing RETRO SNAKE implementation before deciding whether any changes are needed.

## Authority and adaptation

- `AGENTS.md`, `docs/specs/GAME_SPEC.md`, `docs/specs/TOOL_CONTRACT.md`, and the historical Hint prompt at `docs/prompts/week3/BUILD_PROMPT_FINAL_VERSION.md` define the project boundary for that milestone.
- The Week 3 course documents are exercise guidance. They do not override the project specifications or authorize adding a new product feature.
- The exercise's `Ticket` classification examples (`category`, `matchId`, replay messages) are instructional examples from the course package. RETRO SNAKE currently specifies a Snake game, runtime-validated `GameConfig`, and local read-only AI Hint. Do not add replay lookup, ticket classification, or a replay AI feature just to copy those examples.
- The general learning goals still apply: explicit scope, curated context, a runtime-checked structured contract, baseline/evaluation, a controlled change, and evidence.
- Checklist status is **Pending review**. Existing evidence documents report past results, but this file does not independently verify the current working tree.

## Exercise summary

The Week 3 task is to make one bounded AI-assisted behavior or structured feature testable. The pair is expected to:

1. Define one user need and what the feature will not do.
2. Write a prompt/specification with a clear action, input, boundaries, expected output, and acceptance criteria.
3. Identify the context actually used and explain what was excluded, why, and which source wins if sources conflict.
4. Define an output schema and validate untrusted runtime output; types alone are insufficient.
5. Save an initial baseline and run a small evaluation set before and after one controlled change.
6. Record at least one real failure, form a hypothesis about its cause, and choose a check that can distinguish it from another possible cause.
7. Review the diff, preserve actual command/check output, state limitations, and attribute contributions accurately.

The exercise asks for a small, reviewable result. It explicitly excludes adding a second model, RAG, an autonomous loop, a large evaluation framework, a new framework, credentials, or a broad refactor. Optional experiments come only after the minimum behavior and evidence are stable.

## Notes and reusable guidance from the session material

### Prompt and acceptance criteria

A prompt should make these visible:

- the role or task the model performs;
- the intended result and relevant input;
- boundaries, including what must not be invented or changed;
- the output fields, types, allowed values, and missing-value behavior;
- examples and acceptance criteria that can show success or failure.

Prefer observable behavior over subjective wording such as “smart,” “useful,” or “professional.” A persuasive answer is not proof of correctness.

### Context selection

Use only context relevant to the decision. Before a prompt or model operation, be able to say what was actually included, what was left out, and why. Note source priority and risks such as stale, conflicting, private, or untrusted content. A file's presence in a repository does not prove it was included in a model request.

The material names four common context failures:

- **Poisoning:** an earlier error is later repeated as fact; correct or remove the source.
- **Distraction:** unrelated history crowds out the current task; summarize or start with focused context.
- **Clash:** old and current rules conflict; identify the authoritative version and exclude stale rules.
- **Lost in the middle:** a key constraint is buried; shorten and structure the context, and make important boundaries easy to find.

These are diagnosis aids, not a reason to blindly add more prompt text. Fix the layer supported by evidence.

### Structured output and evaluation

- Runtime validation checks actual data. A TypeScript cast or compile-time type does not validate parsed JSON or other runtime input.
- Schema validation checks shape, required fields, types, and allowed values. Semantic checks ask whether the result is supported by the input and follows the intended rule.
- Use a small set of cases with expectations written before running them. Include typical, boundary, incomplete/invalid, and known-failure cases where relevant.
- Preserve the same examples and baseline across the change. Change one main factor at a time (prompt, context, or schema) so the result is interpretable.
- Keep a holdout example independent: do not use it to tune the prompt before recording its result.
- State what the checks demonstrate and what remains unknown. A small eval does not establish general model reliability.

### AI-assisted work and evidence

- Send a coding assistant only relevant instructions, specifications, files, examples, boundaries, and checks. The assistant's assertion that work is complete is not evidence.
- Review the plan and diff. Accept suggestions only after checking them against the project contract and actual behavior.
- If the starting check is already failing, record expected versus actual output and the last known-good checkpoint before changing scope.
- Save actual command output and results. Do not alter generated output to make it look successful or claim checks that were not run.
- Keep an AI usage record concise and factual: purpose, relevant context/specification, outcome, accepted or modified suggestion, and how it was checked. Do not record private chain-of-thought.
- The course assignment suggests stopping scope expansion and writing a precise blocker if stuck for about 20 minutes. This is course workflow advice, not a reason to abandon authorized work without reporting useful findings.

## Review checklist for the current RETRO SNAKE implementation

Use this checklist in a future implementation review. Start with every item marked **Pending**; update its status only after inspecting the current code or rerunning the relevant check.

### A. Scope and specification

- [ ] **Pending** — Current behavior agrees with `AGENTS.md` and `docs/specs/GAME_SPEC.md`.
- [ ] **Pending** — The game remains within the 20 × 20 Snake scope and the explicitly permitted local AI Hint flow.
- [ ] **Pending** — No ticket/replay classifier, external provider, network request, backend, extra tool, write capability, autonomous loop, unrelated framework, or broad refactor has been introduced.
- [ ] **Pending** — The current Definition of Done and out-of-scope boundaries are clear and testable.

### B. Structured runtime contracts

- [ ] **Pending** — `GameConfig` values are validated at runtime; invalid configuration uses an explicit safe fallback and exposes a clear error.
- [ ] **Pending** — AI Hint tool proposal validation rejects unknown names, extra fields, and invalid `detail` values before tool execution.
- [ ] **Pending** — `get_game_state` returns only the contract's sanitized snapshot and does not mutate authoritative game state.
- [ ] **Pending** — Tool output and final `HintResponse` are runtime-validated; malformed or unsupported values cannot appear as a successful hint.
- [ ] **Pending** — Validation checks meaning and safety where required, not only JSON shape or TypeScript types.

### C. Baseline, evals, and behavior

- [ ] **Pending** — A baseline/checkpoint and its actual status are documented; pre-existing failures are distinguished from regressions.
- [ ] **Pending** — `docs/tracking/evidence/EVIDENCE_003.md` contains the core baseline and explicit normal, boundary, invalid-configuration, and failure eval cases; Hint-specific evals are in `EVIDENCE_004.md`.
- [ ] **Pending** — The same core cases are compared before and after a change; results are not selectively replaced with more favorable examples.
- [ ] **Pending** — Relevant game behavior is checked: ready/start, direction rules, food placement, score and growth, wall/body collision, pause/resume, restart, and win handling where covered by the game specification.
- [ ] **Pending** — At least one real or deliberately constructed failure has a specific hypothesis and a check that can distinguish competing explanations.
- [ ] **Pending** — Holdout cases, if used, were kept independent of prompt or rule tuning until their result was recorded.

### D. AI Hint negative and failure paths

- [ ] **Pending** — Valid Hint flow invokes only `get_game_state`, with the expected validated input and call count.
- [ ] **Pending** — Invalid arguments and unsupported tool names produce zero tool calls.
- [ ] **Pending** — Tool output failure, mock-model failure, and malformed final response produce the specified safe local fallback and no fabricated hint.
- [ ] **Pending** — Tests/evidence show that the hint path leaves score, snake, direction, food, configuration, timer, and game status unchanged.
- [ ] **Pending** — No secrets, environment values, source code, full snake body, or unrelated/private browser data are exposed in the hint snapshot, UI, or evidence.

### E. Diff, verification, and evidence

- [ ] **Pending** — The diff contains only intentional files and changes required by the accepted scope.
- [ ] **Pending** — Existing tests have not been weakened or removed to make checks pass.
- [ ] **Pending** — `npm run typecheck`, `npm test`, and `npm run build` have been run for the implementation review, with actual outputs preserved in evidence as required by `AGENTS.md`.
- [ ] **Pending** — Evidence describes the claim, relevant code/diff, actual commands/results, negative/failure checks, and known limitations.
- [ ] **Pending** — `docs/tracking/AI_USAGE_LOG.md` records significant AI-assisted decisions accurately and contains no private chain-of-thought or secrets.
- [ ] **Pending** — The implementation and evidence are understandable and repeatable by another reviewer.

## Course-specific `Ticket` exercise examples (reference only)

The weekly assignment adds a stricter classification exercise. These examples are useful for understanding semantic validation, but they are **not RETRO SNAKE acceptance cases** unless a separate task explicitly adopts that exercise.

| Message | Expected category | Expected `matchId` | Rule illustrated |
|---|---|---|---|
| `Replay M-104 se ruši.` | `bug` | `M-104` | A reported failure is a bug. |
| `Kako da otvorim replay?` | `question` | `null` | Never infer an ID that is absent. |
| `Replay M-104 se ruši. Kako da ga otvorim?` | `bug` | `M-104` | Mixed intent precedence: bug before question. |
| `Želim izvoz replay-a za M-208.` | `request` | `M-208` | Extract only an ID present in the message. |

The material also requires a deliberately wrong but parseable result to be rejected semantically, and an independent holdout that was not used to tune the prompt. Do not implement `Ticket` or `matchId` in the Snake product as a side effect of this reference section.

## Source files

- `week-03-session-01-weekly-assignment.md`
- `week-03-session-01-session-material.md`

These are course materials and examples. Project-specific implementation decisions remain governed by the repository specifications listed above.
