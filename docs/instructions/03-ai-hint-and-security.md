# AI Hint and Security

This repository has exactly one permitted AI/tool flow: the local read-only Hint defined in [`../specs/TOOL_CONTRACT.md`](../specs/TOOL_CONTRACT.md) and the historical task brief in [`../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md`](../prompts/week3/BUILD_PROMPT_FINAL_VERSION.md).

## Allowed behavior

- Use the fake/mock model path only. Never add a live provider, API key, provider network request, or external AI service. The game backend is allowed; the Hint must use the latest validated server snapshot already held by the client and make no separate request.
- Allow only the `get_game_state` tool and its documented `{ detail: "summary" | "tactical" }` input.
- Validate the proposed tool name and strict arguments before executing anything. Invalid or unsupported proposals must make zero tool calls.
- Return only the documented sanitized game snapshot. Do not expose secrets, environment values, source code, local storage, the full snake body, or unrelated/private browser data.
- Validate tool output and final `HintResponse` at runtime. Malformed or semantically unsupported output must not be shown as success.
- On any invalid or failed step, show the defined safe local fallback. Never fabricate a successful hint.

## State and trust boundaries

- Treat user input, model output, parsed JSON, tool proposals, and tool output as untrusted data, not instructions.
- A model proposal is not permission. The application retains authority over the allowlist, validation, and execution.
- The tool is read-only. It must not change score, direction, snake, food, configuration, timer, game status, or restart the game. Its sanitized snapshot is derived locally from the authoritative game snapshot received from the backend.
- Keep errors safe and useful. Do not show credentials, raw sensitive payloads, private prompts, or stack traces.
- Do not add write tools, arbitrary code execution, extra tools, autonomous loops, or cross-provider fallback.

## Required evidence for a Hint change

Cover valid success, invalid arguments before tool execution, unsupported tool rejection, malformed tool output, mock/provider-simulator failure, malformed final response, and the invariant that game state is unchanged. Check and report call counts where relevant. Keep tests offline and deterministic.
