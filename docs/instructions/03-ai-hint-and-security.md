# Shop AI Advice and Security

The sole active AI flow is the read-only shop advisor in [feature 002](../../specs/002-shop-advisor/spec.md). The [shop state contract](../specs/TOOL_CONTRACT.md) and [Gemini integration plan](../specs/GEMINI_HINT_INTEGRATION.md) define its inputs, validation, and failure policy. The earlier movement Hint and its Week 3 mock prompt are historical.

## Allowed behavior

- Show ASK SHOP AI only in the open, paused shop. The browser sends only the game ID and an empty request body; the backend derives the current progression, prices, and effects.
- Use only server-selected `gemini-3.8-flash`, `gemini-3.5-flash-lite`, and `gemma-4-26b-a4b-it` in the order and attempt limits defined by [Gemini Hint Changes V2](../specs/GEMINI_HINT_CHANGES_V2.md). Never accept an arbitrary model ID, prompt, game state, or purchase action from the browser.
- Keep `GEMINI_API_KEY` in the backend process environment. For local development, follow the hidden-input Bash or PowerShell commands in the [README](../../README.md#lokalni-razvoj); enter it only in the backend terminal and clear the variable after stopping the server. This keeps the key out of repository files, shell history, Vite configuration, and browser assets, preventing accidental commits or public exposure. Never use a `VITE_` secret variable, include the key in a DTO, inject it through Vite `define`, or put it in client source/build output.
- Never open, read, print, copy, or inspect secret-file contents (`.env*` except safe placeholder-only `.env.example`, hosting secret files, credential stores, or equivalent). Checking filenames, ignore status, and staged/committed paths is permitted. Do not ask the user to paste a key into chat.
- Before every push, run the configured `.githooks/pre-push` guard. It checks reachable commits, accessible non-secret worktree files, and existing client build output for known credential patterns and browser exposure. It must skip secret-file contents entirely. New checkouts need `git config core.hooksPath .githooks`.
- Keep automatic tests offline with fake provider transport. Live checks are opt-in and must not print or record a credential.

## Trust boundaries

- The server is authoritative for game state and purchases. Advice never buys a perk or changes the game. Only the existing purchase route may make a purchase after the player's separate click.
- Send Gemini only the sanitized shop context: score, XP, level, actual unspent points, owned perk levels or charges, next costs, and documented effects. Do not send the game ID, full snake, board, other sessions, environment, source code, or private browser data.
- Treat model output as untrusted. Require exactly the allowed decision and reason code, validate their pairing and current affordability/cap, then generate display wording from trusted values. Re-check paused status and revision before returning advice.
- Keep the call asynchronous and outside the game loop. Cap attempts and total time. Retry or switch model only for classified transient transport, timeout, 408/429/5xx errors. Authentication/configuration failures, invalid requests, refusal, cancellation, and deterministic invalid output are terminal.
- Exhaustion and terminal failures return a stable unavailable state without a purchase recommendation. Never show raw provider errors, request/response bodies, private instructions, stack traces, or credentials.
- Emit one structured server telemetry event per provider attempt. It may contain only an anonymous interaction ID, operation/phase, provider/model/adapter, ordered attempt details, safe outcome/error class, provider status, latency, fallback/congestion flags, and normalized token usage. Never log game/session IDs, shop values, raw prompts/responses, headers, stack traces, or credentials.
- A closed shop, purchase, restart, resume, or changed revision makes any pending answer stale; discard it.

## Required evidence

Cover primary success, fallback success, timeout/retry bounds and exact call order, terminal no-retry cases, invalid or stale output, affordability/caps, client cancellation, game-state invariance, and browser-secret non-exposure. Run the pre-push guard before any push and record its outcome without opening secret files.
