# RETRO SNAKE — Agent Instructions

## Authority and scope

- Follow the user's current request and acceptance criteria within this project contract.
- Keep RETRO SNAKE a small, original TypeScript/Vite browser game: 20 × 20 board, three-segment snake, controls, food, score, collisions, restart, runtime configuration validation, and focused tests.
- The only AI/tool exception is the local, read-only `get_game_state` Hint flow defined in `docs/specs/TOOL_CONTRACT.md`. No live provider, API key, network call, backend, write-capable tool, or game-state mutation is allowed.
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
