# Project Architecture and Game Rules

Read this module for changes to game behavior, state transitions, rendering, or configuration. The authoritative numerical and acceptance requirements are in [`../specs/GAME_SPEC.md`](../specs/GAME_SPEC.md).

## Product boundary

- RETRO SNAKE is an original, minimal browser game on a 20 × 20 board. It has a three-segment starting snake, arrow-key/touch controls, food, score, collision handling, pause/resume, restart, and win handling.
- Preserve the existing TypeScript + Vite stack. Do not add backend, accounts, multiplayer, online leaderboard, deployment, new game modes, or third-party visual/audio assets.
- The local AI Hint is a narrow demonstration described by [`../specs/TOOL_CONTRACT.md`](../specs/TOOL_CONTRACT.md). It does not change the game rules or authoritative state.

## State and rendering boundaries

- Keep state transitions and game rules in pure TypeScript where practical.
- The game engine owns authoritative game state. UI controls dispatch intended actions; rendering reads state and never mutates it.
- Keep randomness explicit/injectable in the game logic when needed for deterministic tests.
- Keep DOM/CSS responsible for the board, controls, status, and responsive presentation. Do not move game rules into event handlers or rendering code.
- Preserve the existing module layout unless a scoped change requires otherwise. Avoid broad refactors made only to demonstrate a pattern.

## Runtime configuration

- `GameConfig` is runtime input. Validate its actual values; TypeScript types alone are not runtime validation.
- Reject invalid or unsupported values with the specified explicit safe fallback and a clear error. Never silently proceed with unknown values.
- Keep defaults and constraints synchronized with `specs/GAME_SPEC.md` and the tests.

## Change checklist

- Identify the relevant game rule and acceptance condition before changing behavior.
- Preserve unrelated game behavior and the read-only AI Hint boundary.
- Update the owning task evidence with focused tests/evals when accepted behavior changes.
- Update the spec only when the user-approved requirement changes; do not rewrite the spec to fit an accidental implementation.
