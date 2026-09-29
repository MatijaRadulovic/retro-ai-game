# RETRO SNAKE — Refactor Plan

## Goal and accepted decisions

Move the existing Snake game to a TypeScript client/server architecture while preserving its current single-player gameplay. The server owns game configuration, sessions, timers, transitions, and snapshots. The browser sends actions and renders snapshots.

- Use Node's built-in HTTP server for JSON endpoints and `ws` for snapshot broadcasts.
- Host multiple independent, in-memory game containers. Each has shared game state and a `players` collection; each player owns its snake, direction, and score. Require one player per container in this version.
- Do not add room creation/join endpoints or multiplayer UI. Keep the container and player state separable so more players can be added later.
- Keep the current 20 × 20 board, rules, configuration defaults, visual style, and local read-only mock Hint.
- Continue to store the personal best score in browser local storage.
- Run the backend locally alongside Vite. No authentication, database, hosting, or deployment is included.

## Work plan

### 1. Project contract and documentation

- [x] Record the accepted architecture and scope in this plan.
- [x] Update `AGENTS.md`, architecture guidance, and `GAME_SPEC.md` to permit the requested backend and define the new authority boundary.
- [x] Save the implementation prompt and link the plan from the docs index and README.
- [x] Start the work log, AI usage record, and task evidence before code changes.

### 2. Server game model and lifecycle

- [x] Add explicit session, player, snapshot, and API error types with runtime action validation.
- [x] Reuse the pure game engine and validated `GameConfig`; make the server session manager own all state transitions and tick timers.
- [x] Support multiple independent single-player containers in memory, with create/read/move/pause/resume/restart operations.
- [x] Validate JSON bodies and action values; return safe, consistent errors for invalid input and unknown sessions.
- [x] Broadcast authoritative snapshots over WebSocket after state changes and ticks.

### 3. Browser integration

- [x] Create a server session at startup and render only validated server snapshots.
- [x] Send keyboard/touch directions and pause/restart actions to the server; remove browser-owned game state and tick scheduling.
- [x] Keep Hint read-only by deriving its existing sanitized snapshot from the latest server snapshot; do not add a model provider or separate Hint network call.
- [x] Add Vite API/WebSocket proxying and document starting the backend and frontend locally.

### 4. Validation and evidence

- [x] Add deterministic tests for session lifecycle, game rules through the service, request validation, API errors, and WebSocket snapshots.
- [x] Run `npm run typecheck` and record the actual result below.
- [x] Run `npm test` and record the actual result below.
- [x] Run `npm run build` and record the actual result below.
- [x] Review the final diff and update task evidence, work log, and AI usage log with actual outcomes and limitations.

## Definition of done

- [x] The browser no longer advances or mutates authoritative game state; the TypeScript server owns game state and tick timing.
- [x] Multiple independent single-player game containers can run on one server, each with one player and an isolated configuration/state.
- [x] The client can create/read a game, submit moves, pause, resume, restart, and receive current snapshots over WebSocket while retaining existing controls and presentation.
- [x] Existing Snake rules and the mock Hint behavior remain intact; no powerups, obstacles, map choices, multiplayer participation, or other gameplay features are introduced.
- [x] Runtime inputs are validated, focused tests cover success and failure cases, all three required project checks pass, and the evidence records the commands and actual results.

## Out of scope

- Room creation/join flows, multiple players in one game, multiplayer UI, accounts, authentication, persistent storage, leaderboards, or deployment.
- Lives, shields, speed/invincibility/double-food powerups, breakable walls, obstacles, map/layout selection, new game modes, or altered collision rules.
- Live AI/provider integrations, API keys, AI write actions, third-party assets, audio, and unrelated framework or visual refactors.

## Validation record

Checks are marked only after they have run. Full output and exit status belong in [Evidence 005](../tracking/evidence/EVIDENCE_005.md).

- [x] `npm run typecheck` — passed, exit 0.
- [x] `npm test` — passed, 26/26 tests, exit 0.
- [x] `npm run build` — passed, exit 0.
- [x] `git diff --check` — passed, exit 0.
- [x] Focused Markdown link scan — all links in the new/updated plan, spec, prompt, guidance, README, and task evidence resolve.
- [x] Manual check — user reports they checked the game manually and everything works. Individual scenarios were not recorded; the agent's browser surface was unavailable. See Evidence 005.
