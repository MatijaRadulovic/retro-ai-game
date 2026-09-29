# Evidence 003 — Snake Core Baseline and Controlled Hint Change

This record combines the original core baseline, the Week 3 core eval cases, and the evidence for the later read-only Hint change. Keeping these together preserves the before/after trail without a separate baseline or global eval file.

## Related project instructions and prompts

- [Project instructions](../../INSTRUCTIONS.md)
- [Game specification](../../specs/GAME_SPEC.md)
- [Initial build prompt](../../prompts/BUILD_PROMPT_V1.md)
- [Mock Hint prompt](../../prompts/BUILD_PROMPT_HINTS-MOCK.md)
- [AI tool contract](../../specs/TOOL_CONTRACT.md)

## Baseline — Session 003

This records the verified Snake core immediately before the AI Hint layer was added on 2026-09-20. The core files `src/game/snakeConfig.ts`, `src/game/snakeEngine.ts`, and `tests/snake.test.ts` were the baseline for movement, collisions, and runtime configuration.

### Baseline verification output

```text
$ npm test
tests 9
pass 9
fail 0

$ npm run build
✓ built in 51ms
```

### Baseline behavior and known gap

The browser showed a playable 20 × 20 Snake board, score, pause, and restart. There was no way to request a hint. The AI Hint UI, tool contract, allowlist, validation, and failure paths did not yet exist.

This is the baseline for the controlled Hint change, not a claim about an earlier starter project. A separate pre-AI Git snapshot was not saved.

## Context record for the controlled change

This task record replaces the standalone context manifest for this milestone. It records the relevant context and boundaries for the change; instructions describe stable rules, while this section records task-specific context.

| Source | Used | Priority | Purpose / risk |
|---|---:|---|---|
| `AGENTS.md` | Yes | Highest project rules | Scope, verification, security boundaries |
| `docs/specs/GAME_SPEC.md` | Yes | High | Game behavior and configuration contract |
| `docs/prompts/BUILD_PROMPT_V1.md` | Yes | High | Original game scope and initial task constraints |
| `README.md` | Yes | Medium | Setup and commands; may become stale |
| `src/game/snakeConfig.ts`, `src/game/snakeEngine.ts` | Yes | High | Runtime configuration and authoritative game logic |
| `src/ai/hint.ts`, `tests/snake.test.ts`, `tests/hint.test.ts` | Yes | High | Hint boundary and executable behavior checks |
| UI DOM/CSS | Yes | Medium | Relevant Hint control and presentation |
| Runtime keyboard/user input | At runtime only | Untrusted data | Input to validate; never an instruction source |
| Old chat transcript / unrelated game code and assets | No | None | Stale or unrelated context; risk of scope contamination |
| Credentials, `.env`, private data, live provider context | No | None | Excluded; not needed and prohibited by project scope |

When sources conflict, follow `AGENTS.md`, then the game/tool specifications and accepted prompt. Implementation and tests are evidence of current behavior, not authority to silently change requirements.

## Problem, hypothesis, and controlled change

- **Problem:** the game had no bounded way for a user to request a hint. Free-form text, a network call, or a write-capable tool would violate the small and safe project scope.
- **Signal:** a valid request should make one read-only tool call; invalid or unsupported requests should make zero calls; invalid output should never reach the UI as a hint.
- **Hypothesis:** an allowlist containing only `get_game_state`, plus strict input/output and `HintResponse` validation, can provide a local demonstration without opening a write path.
- **Smallest change:** add `src/ai/hint.ts`, one button and panel, with no dependency, API call, or change to the Snake engine.

## Core eval cases

The core cases below are recorded separately from the Hint-specific cases in [Evidence 004](EVIDENCE_004.md). `N/A` means the capability did not exist at baseline; it does not mean the case passed.

| ID | Input / scenario | Expected behavior | Baseline | After Hint change | Result |
|---|---|---|---|---|---|
| E1 | Normal start | Remain `ready` until a valid direction is pressed | PASS | PASS | PASS |
| E2 | Head leaves the grid | Enter `game_over` without moving outside the board | PASS | PASS | PASS |
| E3 | `{ gridSize: 9 }` | Use runtime fallback and expose a clear error | PASS | PASS | PASS |
| E4 | Food directly ahead | Score +1, snake grows by 1, new food is not on the snake | PASS | PASS | PASS |

## Post-change verification output

```text
$ npm run typecheck
exit 0

$ npm test
tests 16
pass 16
fail 0

$ npm run build
✓ 7 modules transformed.
✓ built in 51ms
```

The Hint-specific success, rejection, read-only, and failure evidence is in [Evidence 004](EVIDENCE_004.md). Tests are `tests/snake.test.ts` and `tests/hint.test.ts`.

## Limitation and contribution record

The local fake model does not evaluate the quality of a real LLM. A live provider is intentionally outside this project.

The repository implementation, tests, and documentation are Uroš's independent work. Although officially assigned as a pair with Matija, they agreed to complete separate individual versions.
