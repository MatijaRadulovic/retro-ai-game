# RETRO SNAKE — Agent Instructions

## Authority and scope

- Follow the user's current request and acceptance criteria within this project contract.
- Keep RETRO SNAKE a small, original TypeScript game with a Vite browser client and a TypeScript Node backend: 20 × 20 board, three-segment snake, controls, food, score, collisions, restart, runtime configuration validation, and focused tests.
- The backend is authoritative for in-memory game containers, configuration, transitions, timers, and snapshots. One server may host multiple independent single-player games; each has one player. No room/join flow or multiplayer play is in scope yet.
- The only AI flow is the single read-only Hint. The approved next iteration replaces its mock model with a server-side Gemini call while preserving the `get_game_state` contract in `docs/specs/TOOL_CONTRACT.md` and the security boundary in `docs/instructions/03-ai-hint-and-security.md`. Do not add another provider, model selection from the browser, write-capable tool, or game-state mutation.
- Gemini credentials are server-runtime secrets only. Never open, read, print, copy, or inspect secret files such as `.env`, deployment secret files, or credential stores. Do not pass credentials to the browser, Vite client, logs, prompts, tests, screenshots, or tracking records. Run the repository pre-push secret and frontend-exposure guard before every push; the configured hook is `.githooks/pre-push`.
- Do not add third-party assets, music, logos, unrelated frameworks, or broad refactors.

## Core engineering rules

- Keep game transitions in pure TypeScript; DOM/CSS renders state but does not mutate authoritative state.
- Treat runtime input, model output, and tool proposals as untrusted. Validate at runtime and use explicit safe fallbacks.
- Do not weaken or delete tests to make them pass. Never expose or commit credentials or private data.

## Required working and reporting workflow

- Before a larger change, state the goal, scope, files, assumptions, checks, and out-of-scope work.
- For every substantive task, follow `docs/instructions/05-workflow-tracking-and-reporting.md`: keep the work log current, preserve actual verification evidence, update relevant tracking records, and leave a concise handoff that can be reused in a weekly report. Record why checks were skipped when they do not apply.

## Where to read next

Start with [docs/INSTRUCTIONS.md](docs/INSTRUCTIONS.md). It routes each task to the relevant instruction modules and project specifications. Do not copy those detailed rules into this file.
