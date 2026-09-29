# Evidence 004 — Controlled Read-only AI Hint

This is the task-specific evaluation and evidence record for the AI Hint flow. Core Snake baseline/eval cases and the broader change context are in [Evidence 003](EVIDENCE_003.md).

## Related contract and prompt

- [Mock Hint prompt](../../prompts/BUILD_PROMPT_HINTS-MOCK.md)
- [Tool contract](../../specs/TOOL_CONTRACT.md)
- [Game specification](../../specs/GAME_SPEC.md)
- Implementation: `src/ai/hint.ts`
- Tests: `tests/hint.test.ts`

## Implementation boundary

The Hint flow validates the model-simulator proposal, enforces the tool allowlist, validates the sanitized tool output, and validates the final `HintResponse`. The UI uses `createFakeHintModel()`. There is no live provider, network call, or API key. The sole tool is read-only `get_game_state`.

## Hint-specific evals

| ID | Scenario | Expected behavior | Observed result / evidence |
|---|---|---|---|
| H1 | Valid local Hint | Validated `get_game_state` request, one call, valid response | PASS; test `valid AI hint request…`, `callCount = 1` |
| H2 | `detail: "everything"` plus `executeCode` | Reject before tool execution | PASS; test `invalid arguments…`, `callCount = 0` |
| H3 | Unsupported `reset_game` tool | Reject before execution | PASS; test `unsupported tool names…`, `callCount = 0` |
| H4a | Malformed tool snapshot | No hint is presented as success | PASS; test `a malformed read-only tool result…` |
| H4b | Fake provider failure | Safe local error is shown | PASS; test `provider failure…` |
| H4c | Malformed final `HintResponse` | Reject the response | PASS; test `a malformed final response…` |
| H5 | Read-only state boundary | Snapshot reveals no full snake body and does not mutate `GameState` | PASS; test `get_game_state exposes no body data…` |

## Actual test output

```text
$ npm test
tests 16
pass 16
fail 0
```

The historical full verification commands and outputs for the combined milestone are recorded in [Evidence 003](EVIDENCE_003.md).

## Limitation and contribution record

This is a controlled local fake/mock path, not an evaluation of a live provider or generated-hint quality. That limitation is intentional; the negative and failure paths remain repeatable without secrets or network access.

The repository implementation, tests, and documentation are Uroš's independent work. Although officially assigned as a pair with Matija, they agreed to complete separate individual versions.
