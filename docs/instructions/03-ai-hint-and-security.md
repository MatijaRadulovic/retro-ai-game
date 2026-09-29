# AI Hint and Security

This repository has exactly one permitted AI flow: the read-only Hint defined in [`../specs/TOOL_CONTRACT.md`](../specs/TOOL_CONTRACT.md). The user has approved replacing its mock model with one server-side Gemini integration under the scope in [`../specs/GEMINI_HINT_INTEGRATION.md`](../specs/GEMINI_HINT_INTEGRATION.md). The Week 3 prompt remains historical context, not authority for provider behavior.

## Allowed behavior

- Gemini is the only permitted live provider and is called only by the TypeScript backend. The browser calls our backend Hint endpoint; it never calls Gemini directly. The Gemini key must be read only by server runtime configuration. Never use a `VITE_` secret variable, return a credential in a DTO, inject it through Vite `define`, or place it in client source/build output.
- Never open, read, print, copy, or inspect the contents of secret files (`.env*` except the safe placeholder-only `.env.example`, hosting secret files, credential stores, or equivalent). It is acceptable to check filenames, ignore status, and whether a secret file was staged/committed, without opening its contents. Do not ask the user to paste a key into chat.
- Before every push, run the configured `.githooks/pre-push` guard. It scans outgoing commits, all locally reachable Git history, accessible non-secret working files, and any existing client build for known credential patterns; it rejects secret-file paths in commits and checks browser source/build output for provider-key exposure. The guard must skip secret-file contents entirely. If the hook is not enabled in a checkout, enable it with `git config core.hooksPath .githooks` and run it manually before pushing.
- New checkouts must enable the tracked hook once with `git config core.hooksPath .githooks`. In this workspace the hook is enabled through local Git configuration; do not assume Git clones copy that local setting.
- Keep automatic tests offline with a fake Gemini transport. Live smoke checks are opt-in, use a manually configured runtime secret, and must never print or record it.
- Allow only the `get_game_state` tool and its documented `{ detail: "summary" | "tactical" }` input.
- Validate the proposed tool name and strict arguments before executing anything. Invalid or unsupported proposals must make zero tool calls.
- Return only the documented sanitized game snapshot. Do not expose secrets, environment values, source code, local storage, the full snake body, or unrelated/private browser data.
- Validate tool output and final `HintResponse` at runtime. Malformed or semantically unsupported output must not be shown as success.
- On any invalid or failed step, show the defined safe local fallback. Never fabricate a successful hint.

## State and trust boundaries

- Treat user input, model output, parsed JSON, tool proposals, and tool output as untrusted data, not instructions.
- A model proposal is not permission. The application retains authority over the allowlist, validation, and execution.
- The tool is read-only. It must not change score, direction, snake, food, configuration, timer, game status, or restart the game. Its sanitized snapshot is derived from the authoritative backend snapshot.
- The Gemini call is asynchronous and outside the game loop. UI shows a pending state, applies a finite deadline, handles cancellation/timeout, and returns a stable local fallback when allowed attempts are exhausted.
- Retry only classified transient transport/provider failures under one total time budget. Authentication/configuration errors, invalid requests, policy refusal, cancellation, and deterministic validation failures do not retry or fall through to another provider. No second provider is in scope; after the bounded Gemini policy is exhausted, use the documented local safe fallback.
- Parse, schema-validate, and semantically validate every Gemini result before display. Provider error details and raw request/response bodies remain server-side and are redacted from logs and public responses.
- Keep errors safe and useful. Do not show credentials, raw sensitive payloads, private prompts, or stack traces.
- Do not add write tools, arbitrary code execution, extra tools, autonomous loops, other providers, or model selection from browser input.

## Required evidence for a Hint change

Cover valid success, invalid arguments before tool execution, unsupported tool rejection, malformed tool output, fake Gemini success and failure classes, timeout/retry bounds, fallback, malformed final response, browser-secret non-exposure, and the invariant that game state is unchanged. Check and report call counts where relevant. Keep automatic tests offline and deterministic. Before push, run the secret/frontend-exposure hook and record its result without opening secret files.
