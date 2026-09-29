# Evidence 003 — Snake Core Baseline and Regression Evaluation

## Record

- **Purpose:** preserve the last recorded browser-only Snake core baseline before the local AI Hint work, and define the core regression scenarios reused for the Hint change.
- **Related spec/instructions:** [Base game specification](../../specs/BASE_GAME_SPEC.md), [project instruction index](../../INSTRUCTIONS.md), and [verification guidance](../../instructions/04-testing-and-verification.md).
- **Prompt artifacts:** [Week 3 initial build prompt](../../prompts/week3/BUILD_PROMPT_V1.md); the later Hint change is specified in [Week 3 final prompt](../../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md) and evaluated in [Evidence 004](EVIDENCE_004.md).
- **Baseline date and scope:** 2026-09-20; `src/game/snakeConfig.ts`, `src/game/snakeEngine.ts`, and `tests/snake.test.ts`, immediately before the Hint layer was added.
- **Source/context selection:** see the task-specific context matrix below. The repository-wide [context manifest](../CONTEXT_MANIFEST.md) is only a source map and does not imply every file was used.

## Baseline

The browser showed a playable 20 × 20 Snake board, score, pause, and restart. The Hint UI, tool contract, allowlist, validation, and Hint failure paths did not yet exist. This is the baseline for the controlled Hint change, not a claim about an earlier starter project. No separate pre-AI Git snapshot was saved.

### Baseline verification captured at the time

```text
$ npm test
tests 9
pass 9
fail 0

$ npm run build
✓ built in 51ms
```

`npm run typecheck` output was not recorded for this baseline. Do not infer it passed from the test or build outputs.

## Frozen core eval scenarios

These scenario definitions are reused in Evidence 004 and should not be changed to fit a result. `N/A` means the Hint capability did not exist at baseline; it does not mean the case passed.

| ID | Scenario / input | Expected result | Baseline | After Hint change | Evidence / note |
|---|---|---|---|---|---|
| C1 | Start without pressing a direction | Stay `ready` until a valid direction is pressed | PASS | PASS | Baseline 9-test suite; after 16-test suite, see Evidence 004 |
| C2 | Move head beyond a board edge | Enter `game_over`; head does not move outside board | PASS | PASS | Same cases recorded before/after |
| C3 | Parse `{ gridSize: 9 }` | Use safe runtime fallback and expose a clear error | PASS | PASS | Same cases recorded before/after |
| C4 | Place food directly ahead and advance | Score +1, snake grows by one, new food is not on snake | PASS | PASS | Same cases recorded before/after |
| C5 | Request or validate an AI Hint | Not available in baseline | N/A | See H1–H6 in Evidence 004 | New capability; no baseline pass claimed |

The historical record reports the same four core scenarios as passing before and after. It does not preserve a separate machine-readable test run for each C1–C4 scenario; the recorded suite totals are 9 before and 16 after.

## Task context for the controlled Hint change

| Source | Used | Priority / purpose | Risk or handling |
|---|---|---|---|
| `AGENTS.md` and project instructions | Yes | Project scope and security rules | Higher priority than implementation choices |
| `docs/specs/BASE_GAME_SPEC.md`, `docs/specs/TOOL_CONTRACT.md` | Yes | Base game and read-only tool contracts | Normative for core product behavior |
| Week 3 initial and final prompt artifacts | Yes | Build and Hint task constraints | Task-scoped; subordinate to project contract |
| `README.md` | Yes | Setup and command orientation | Could be stale; verify against package/config |
| Game/Hint implementation and tests | Yes | Existing state and executable behavior | Evidence, not permission to change requirements |
| Runtime input | At runtime | Input data | Untrusted; never an instruction source |
| Old unrelated project code/assets, credentials, `.env`, private data, live provider context | No | Not needed for task | Excluded; credentials/private data must never be included |

If sources conflicted, project rules and specs took priority over prompts and implementation. The detailed source map is in the [context manifest](../CONTEXT_MANIFEST.md).

## Controlled change and after verification

The controlled change was the local mock/read-only Hint layer described in [Evidence 004](EVIDENCE_004.md): add a single allowlisted `get_game_state` flow and its UI, with no live provider, network call, dependency, or change to the Snake engine. The frozen core cases C1–C4 remained passing in the recorded after suite.

Recorded post-change commands and summaries:

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

Hint-specific expected cases and outcomes are in [Evidence 004](EVIDENCE_004.md).

## Limitations and attribution

- The local fake model does not measure a real LLM's hint quality; a live provider was outside scope.
- There is no separate pre-AI Git snapshot, and individual C1–C4 command output was not saved apart from the aggregate test counts.
- The repository implementation, tests, and documentation were Uroš's independent work. Although officially assigned as a pair with Matija, they agreed to complete separate individual versions.
