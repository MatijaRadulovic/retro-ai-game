# Evidence 004 — Controlled Read-only AI Hint Change

## Record

- **Purpose:** evaluate the local AI Hint as one bounded change and preserve its positive, negative, read-only, and failure results.
- **Related spec/instructions:** [Game specification](../../specs/GAME_SPEC.md), [tool contract](../../specs/TOOL_CONTRACT.md), and [verification guidance](../../instructions/04-testing-and-verification.md).
- **Prompt artifact:** [Week 3 final Hint prompt](../../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md). This is the recorded task prompt; its historical text does not have a separate version-history/changelog section.
- **Baseline:** [Evidence 003](EVIDENCE_003.md) records the pre-Hint core baseline, commands, and frozen regression scenarios C1–C4.
- **Changed files in scope:** `src/ai/hint.ts`, Hint UI in `src/main.ts` / `src/styles.css`, and `tests/hint.test.ts`; core Snake engine was not intended to change.
- **Context:** project instructions, game/tool specs, task prompt, relevant implementation/tests. Credentials, `.env`, private data, live provider credentials/context, and unrelated source/assets were excluded.

## Baseline

Before the change, the core game passed 9 tests; recorded baseline commands/output are in Evidence 003. The Hint UI, tool allowlist, validation, and Hint failure behavior did not exist, so Hint-specific baseline results are **N/A**, not passes. The intended change was one local fake/mock flow; there was no real provider or network call.

## Frozen evaluation scenarios and before/after results

The core regression definitions C1–C4 are owned by Evidence 003 and are repeated here by ID to show the same checks across the change. Hint cases H1–H6 were added for the new capability; baseline is N/A because the feature did not exist.

| ID | Scenario | Expected result | Before | After | Evidence / actual result |
|---|---|---|---|---|---|
| C1–C4 | Core start, wall collision, invalid config, and food/growth scenarios from Evidence 003 | Preserve existing Snake behavior | PASS (9-test baseline) | PASS (16-test suite) | Four frozen core cases remained passing |
| H1 | Valid local Hint request | Validate `get_game_state`; execute exactly once; return valid response | N/A | PASS | `valid AI hint request…`; `callCount = 1` |
| H2 | `detail: "everything"` plus `executeCode` | Reject before tool execution | N/A | PASS | `invalid arguments…`; `callCount = 0` |
| H3 | Unsupported `reset_game` tool | Reject before execution | N/A | PASS | `unsupported tool names…`; `callCount = 0` |
| H4 | Malformed tool snapshot | Do not present a successful hint | N/A | PASS | `a malformed read-only tool result…` |
| H5 | Fake provider failure or malformed final `HintResponse` | Return controlled safe error / reject invalid response | N/A | PASS | `provider failure…`; `a malformed final response…` |
| H6 | Read-only boundary | Snapshot omits full snake body and does not mutate `GameState` | N/A | PASS | `get_game_state exposes no body data…` |

## Controlled change and after verification

The one controlled change added `src/ai/hint.ts`, a small Hint control/panel, and focused tests. It allowed only the read-only `get_game_state` tool, validated the proposal, sanitized tool result, and strict `HintResponse`, and used `createFakeHintModel()`. The core engine was not changed.

Recorded after command:

```text
$ npm test
tests 16
pass 16
fail 0
```

The historical full after-change output for typecheck, test, and build is recorded in Evidence 003. The per-Hint case names and outcomes above are the available detail; separate raw output per case was not saved.

## Honest limitations and attribution

- This checks validation, allowlisting, safe failure, and state isolation for a deterministic local fake. It does not evaluate live-provider reliability, real LLM quality, latency, or provider-specific behavior.
- Hint scenarios have no pre-change pass/fail baseline because the feature was absent; the core regression scenarios provide the before/after comparison.
- The repository implementation, tests, and documentation were Uroš's independent work. Although officially assigned as a pair with Matija, they agreed to complete separate individual versions.
