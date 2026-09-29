# BUILD PROMPT — Server-authoritative RETRO SNAKE refactor

Refactor the existing RETRO SNAKE app into a TypeScript/Vite browser client and a TypeScript Node backend. Follow [`REFACTOR_PLAN.md`](../../specs/REFACTOR_PLAN.md) and the current game rules in [`BASE_GAME_SPEC.md`](../../specs/BASE_GAME_SPEC.md).

The server is the sole authority for validated game configuration, session/player state, game transitions, and tick timing. Model a container with shared game state and a `players` collection; each player owns its snake, direction, and score. Use Node's built-in HTTP server plus `ws`: provide endpoints to create and fetch a game, submit a direction, pause, resume, and restart; broadcast authoritative snapshots to connected clients. Keep multiple independent in-memory game containers, each with one player. Do not add room creation/join endpoints or multiplayer participation. Validate all runtime inputs and return safe, consistent API errors.

Update the browser to send actions and render validated snapshots. Preserve the current rules, controls, appearance, local best score, and local fake/read-only Hint. The Hint must use a sanitized snapshot from current server state and never mutate game state. Add no powerups, obstacles, map modes, AI provider, auth, database, or deployment.

Add focused offline tests for game/session behavior, API validation and errors, and WebSocket snapshot delivery. Run `npm run typecheck`, `npm test`, and `npm run build`; record actual output and exit status in `docs/tracking/evidence/EVIDENCE_005.md`, update the checked items in the refactor plan, and append factual work log and AI usage entries. Preserve all pre-existing working-tree changes.
