# Gemini Shop Advisor Integration

**Status:** revised 2026-09-30 by [Gemini Hint Changes V2](GEMINI_HINT_CHANGES_V2.md). The original movement-Hint and earlier two-model retry policy are superseded.

## Purpose and player flow

The player opens the paused perk shop and requests advice on buying Extra XP, Luck, +1 Life, or waiting. The AI returns a structured choice; the server validates it against current authoritative points, prices, caps, and revision. Advice never triggers a purchase. A player buys manually through the existing purchase button.

The client sends `POST /api/games/:gameId/shop-advice` with `{}`. The server builds the read-only [shop context](TOOL_CONTRACT.md), calls Gemini, and returns validated advice or a clearly marked unavailable result. The shop stays usable during the wait. The browser discards answers after a shop close or revision change.

## Model selection and reliability

- Free-tier chain: `gemini-3.8-flash` once, `gemini-3.5-flash-lite` at most twice, then `gemma-4-26b-a4b-it` at most three times. Only these IDs are accepted by server code. Google's [model documentation](https://ai.google.dev/gemini-api/docs/models), [Gemma API guide](https://ai.google.dev/gemma/docs/core/gemma_on_gemini_api), and [pricing](https://ai.google.dev/gemini-api/docs/pricing) document these hosted models and free-tier access. Exact project limits must be checked in AI Studio.
- A logical request has an 85-second total deadline and a maximum 10-second timeout per call. Base delays are 1, 3, 5, 5, then 5 seconds with bounded jitter.
- Gemini models use native structured output. Gemma has a separate text-JSON request branch with a 128-token output cap and the same strict application validation.
- A `Retry-After` at or below five seconds is honored when it fits the deadline. A longer value skips the rest of that model rather than retrying early. A documented allowlisted model returning `404` advances to the next capability branch without retrying that model.
- After two consecutive transient Flash failures across logical requests, the server marks Flash congested in memory for 15 minutes. New requests start with Flash-Lite during the window. The marker expires automatically and is cleared after a later successful Flash call; it is not persisted or exposed publicly.
- Retry/switch only for network/timeout, 408/429, transient 5xx, or confirmed model capability unavailability within the remaining time. Stop on invalid input, missing key, 400/401/403/409, refusal, cancellation, empty/invalid/schema-invalid output, or semantic validation failure.
- Return a stable unavailable result without a purchase recommendation when attempts are exhausted or a terminal failure occurs. Public errors never include raw provider text, prompt, key, or stack.
- Emit one structured JSON server log per attempt containing only an anonymous interaction ID, operation/phase, provider/model/adapter, attempt details, safe status/error class, provider status, latency, fallback/congestion flags, and normalized usage.

## Security and data boundary

- `GEMINI_API_KEY` is read only by the backend at runtime and sent only in a provider request header. Never open or inspect secret-file contents. Never expose it to Vite, browser source/build, DTOs, WebSocket, logs, prompts, tests, screenshots, or evidence.
- For local use, enter the value with the hidden-input commands in the [README](../../README.md#lokalni-razvoj), in the terminal that runs the backend only. This keeps the secret out of committed project files and frontend assets. Clear the variable when the server stops; do not place it in `.env`, `VITE_` configuration, command arguments, or chat.
- Send only current score, XP, level, actual unspent points, perk levels/charges, next costs, and documented effects. No game ID, full snake, board, source code, environment, or unrelated private data enters the prompt.
- Request structured `decision` and `reasonCode` fields; independently parse and validate exact keys, enum values, pairings, affordability, cap, paused status, and revision. Generate the visible explanation from trusted game facts.
- Keep one in-flight request per game. Abort on cancellation/disconnect. The provider cannot call a game tool or mutate state.
- The configured pre-push hook checks known credential patterns and browser exposure without opening secret-file contents.

## Verification and limitations

The [V2 plan](GEMINI_HINT_CHANGES_V2.md), [provider contract](../../specs/002-shop-advisor/contracts/shop-advice-api.md), and [Evidence 010](../tracking/evidence/EVIDENCE_010.md) define and record current acceptance. Automatic tests use fake transport; run typecheck, tests, build, security scan, and the hook. A real provider smoke check requires a separately configured runtime key and opt-in; offline tests do not establish actual project quotas or live response quality.

The [shop advisor system prompt](../prompts/week4/SHOP_ADVISOR_SYSTEM_PROMPT_V1.md) was approved by the user and is active in `server/ai/shopPrompt.ts`. Its game facts were checked against the current engine and perk rules.

## Out of scope

Automatic purchases, browser-supplied game state or arbitrary model IDs, write tools, autonomous loops, non-Google providers, replay summaries, persistence, multiplayer, and Snake economy changes.
