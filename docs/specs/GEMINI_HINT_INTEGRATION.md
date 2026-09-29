# Gemini Hint Integration Plan

## Status and purpose

**Status:** accepted scope and implementation plan; integration code is not implemented yet.

Replace the mock model behind the existing user-triggered Snake Hint with one server-side Gemini request. Keep the current read-only game-state contract and make the game usable when Gemini is slow, unavailable, misconfigured, or returns invalid output.

The user's request authorizes this single-provider change. This plan narrows the generic Week 4 materials to RETRO SNAKE; provider-neutral routers, OpenAI, Gemma, replay summaries, and generic agent loops are excluded.

## User flow

1. The player asks for a Hint while a game is active or paused.
2. The browser sends a small request to the TypeScript backend. It does not send authoritative game state or provider/model selection.
3. The backend validates the game session and derives the permitted `GameStateSnapshot` from its authoritative state.
4. The Gemini adapter receives only that snapshot and a server-owned instruction, using server runtime configuration.
5. The backend validates the response shape and allowed semantics before returning a normalized result.
6. The UI shows a validated Hint, a clearly identified local fallback, or a stable unavailable message. The game state and tick loop continue independently.

## Security requirements

- The provider key is a server runtime secret named `GEMINI_API_KEY`; local development may supply it through an ignored environment file, and hosted runtime uses its secret configuration. `.env.example` may contain only a placeholder.
- Agents and scripts must never open, read, print, copy, or inspect secret-file contents. They may inspect filenames, Git ignore status, and whether such a path was staged or committed. If a real key is exposed, stop using it and ask the owner to rotate it without revealing it.
- The key must never be prefixed with `VITE_`, referenced from browser source, injected by Vite `define`, returned in an API/WebSocket DTO, logged, stored in tests/prompts/screenshots/evidence, or included in a client asset.
- A tracked pre-push hook scans outgoing commit content and accessible worktree/build files for credential-shaped strings; it rejects outgoing secret-file paths without reading those files. It also checks browser source and built assets for key references or key-like values.
- The Gemini request contains only the fields permitted by `TOOL_CONTRACT.md`; do not send the full snake body, session internals, server environment, source, or unrelated browser data.
- Treat the provider response as untrusted. Validate parse, schema, bounds, and game-related semantic rules before displaying it.

## Reliability policy for v1

- Keep the call asynchronous and outside the game tick loop. Show a pending state; prevent duplicate Hint requests while one is active; keep movement/pause/restart available.
- Set an 8-second overall deadline for the logical request, including backoff. Each provider attempt has a maximum 3.5-second timeout. Propagate disconnect/cancellation and do not start another attempt after cancellation or deadline expiry.
- Allow at most **2 Gemini attempts total**: one initial request and one retry. Use a short randomized backoff (250–500 ms). Respect `Retry-After` only when it fits inside the remaining deadline; otherwise stop and use the fallback.
- Retry only timeout/network transport errors, HTTP 429, and transient HTTP 500/502/503. Disable hidden SDK retries so the application controls and counts all attempts.
- Do not retry authentication/configuration errors, invalid requests, 403 permission errors, model-not-found/capability errors, provider refusal/safety outcomes, cancellation, empty/malformed/schema-invalid output, or semantic validation failures.
- There is no alternate provider/model fallback. After the two-attempt limit, show a deterministic local unavailable/fallback message and keep the game playable. Do not claim the model succeeded.
- Public errors stay stable and generic. Server diagnostics may contain interaction ID, attempt number, safe failure category, latency, and model ID, but no key, raw prompt, full response, game payload, or stack trace.

The numbers above are initial v1 policy choices based on the supplied reliability guidance. Adjust only if implementation/evidence shows the 8-second total or two-attempt cap is unsuitable.

## API and data boundary

- Proposed route: `POST /api/games/:gameId/hint`, with an empty JSON object. Reject extra fields. The server derives state from the game session.
- Success returns only the validated `HintResponse` and a stable `source: "gemini"` marker. A local fallback has a distinct source/status and does not masquerade as a model response.
- Failure statuses distinguish invalid/missing game, unavailable/missing provider configuration, timeout/exhausted transient failure, and invalid provider output without exposing upstream text.
- The current `GameStateSnapshot` and `HintResponse` schemas remain the application contracts. Gemini output must not trigger movement or any state transition.

## Verification and Definition of Done

- Fake transport tests prove request shape and that no real network/key is needed for tests.
- Cover success, missing configuration (zero Gemini requests), malformed/empty output, refusal, authentication failure (no retry), retryable transient failure followed by success, exhausted retries, timeout/deadline, cancellation, and safe public errors.
- Assert exact call counts, attempt order, backoff/deadline behavior, and state invariance.
- Prove the key is read only by server configuration and absent from browser DTOs, Vite source/config, logs, test fixtures, prompts, and built client assets. Use placeholder fixtures only.
- Run the pre-push guard against current worktree and outgoing commits. Verify it rejects a synthetic credential in a temporary non-secret fixture and rejects an outgoing `.env` filename without opening that file; do not create or use a real credential for these checks.
- Keep the game controls usable during a pending Hint and after each failure mode.
- Record an opt-in live smoke result separately from automated fake tests. A live result is not required for deterministic tests and must never print the key.
- Preserve the core game checks: `npm run typecheck`, `npm test`, and `npm run build`.

## Out of scope

OpenAI or any second provider/model, browser provider/model selection, automatic alternate-model fallback, tool writes, arbitrary or multi-step agent loops, AI-controlled game actions, hidden/full game state, replay summaries, persistence, deployment, or changes to deterministic Snake rules.

## Source priority

The current user request and this plan govern the Gemini Hint change. `AGENTS.md`, `docs/instructions/03-ai-hint-and-security.md`, `docs/specs/TOOL_CONTRACT.md`, and `docs/specs/BASE_GAME_SPEC.md` express the project adaptation. The accepted powerups/perks feature spec remains separate. The supplied Week 4 files are educational references; their provider examples and broader scenarios do not override the narrower scope above.
