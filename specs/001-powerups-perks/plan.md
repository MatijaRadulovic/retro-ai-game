# Implementation Plan: Run Powerups and Perks

**Branch**: `main` (planning only; Spec Kit feature ID `001-powerups-perks`) | **Date**: 2026-09-29 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-powerups-perks/spec.md`

## Summary

Add run-only XP/level progression, a paused perk shop, board powerups, and collision recovery while
keeping the existing TypeScript Node server authoritative. Extend the pure game transition with a
small feature-rules module, explicit random and active-time inputs, then expose one validated purchase
action and expanded strict snapshots. The Vite client renders those snapshots, keeps only shop
visibility as presentation state, and sends pause/resume/move/restart/purchase intent.

## Technical Context

**Language/Version**: TypeScript 5.7+, Node.js 22+

**Primary Dependencies**: Existing Vite 6 browser client, Node built-in HTTP server, `ws`, and `tsx`;
no new dependency

**Storage**: In-memory game containers; existing browser `localStorage` remains limited to personal
best score

**Testing**: Node built-in `node:test` with deterministic random/clock fixtures; TypeScript compiler;
Vite production build; manual browser scenarios

**Target Platform**: Local Node.js server and modern desktop/mobile browsers supported by Vite

**Project Type**: Small client/server browser game

**Performance Goals**: Preserve one scheduled tick per active game at 60–160 ms effective intervals;
purchase and control responses appear in the next authoritative response/snapshot; board scans remain
bounded by 400 cells

**Constraints**: Server authority; strict runtime validation; pause freezes active-time effects; one
player per container; no persistence, AI/provider change, database, assets, framework, or broad
refactor; existing read-only Hint input/contract remains unchanged

**Scale/Scope**: 20 × 20 board, three powerup types, two five-level perks, up to two held lives,
multiple isolated in-memory single-player containers on one local server

## Constitution Check

*Pre-research gate: PASS. Post-design gate: PASS.*

| Principle | Design evidence | Status |
|---|---|---|
| I. Server-Authoritative State | Awards, random spawn, purchases, effects, collision recovery, active time, and snapshots remain in pure rules plus the server session manager. The client owns only whether a paused overlay is visible. | PASS |
| II. Validate Every Trust Boundary | The purchase body is exact-key validated; strict snapshot parsing checks keys, ranges, occupancy, derived-level consistency, caps, and effect values; invalid actions do not publish or increment revision. | PASS |
| III. Small, Original, and Scoped | Existing stack and layout are retained; one focused game module may be added and no dependency, persistence, account, multiplayer, asset, or unrelated refactor is introduced. | PASS |
| IV. Verification and Evidence | Tasks require focused pure-rule, session, HTTP, protocol, regression, and manual tests plus all project gates and Evidence 006 updates. | PASS |
| V. Narrow Read-Only AI Boundary | This feature makes no Hint/provider change; the Hint tool schema remains unchanged and receives only its existing sanitized core snapshot. | PASS |

No constitution violation requires a complexity exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-powerups-perks/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── game-api.md
├── checklists/
│   ├── requirements.md
│   └── feature-quality.md
└── tasks.md
```

### Source Code (repository root)

```text
server/
├── gameSession.ts       # authoritative containers, active clock, purchases, scheduling
└── httpServer.ts        # exact request parsing and JSON action route

src/
├── api/
│   └── gameClient.ts    # purchase intent and validated snapshots
├── game/
│   ├── gameProtocol.ts  # strict expanded snapshot contract
│   ├── runFeatures.ts   # new pure XP, perk, effect, spawn, and purchase rules
│   ├── snakeConfig.ts   # existing validated core configuration and pace
│   └── snakeEngine.ts   # pure movement, pickup, collision, respawn transitions
├── ai/
│   └── hint.ts          # unchanged read-only Hint boundary
├── main.ts              # render-only HUD/shop/board and intended actions
└── styles.css           # board powerups, cubes, responsive shop overlay

index.html               # semantic HUD/shop/control elements

tests/
├── runFeatures.test.ts  # new focused pure progression/perk/powerup cases
├── snake.test.ts        # pickup, collision, recovery, reset, core regressions
├── gameSession.test.ts  # authoritative timing/purchase/container behavior
├── gameProtocol.test.ts # valid and malformed expanded snapshots
├── httpServer.test.ts   # purchase route and error/no-mutation contract
└── hint.test.ts         # unchanged read-only regression boundary
```

**Structure Decision**: Retain the current single repository with server, shared game logic, browser
client, and flat test directory. Add `src/game/runFeatures.ts` to isolate pure economy/effect rules
instead of expanding HTTP or DOM code with gameplay decisions. Extend the existing engine and session
manager rather than creating a second game-state pipeline.

## Complexity Tracking

No violations or justified complexity exceptions.

## Phase 0 — Research Decisions

Research results are consolidated in [research.md](research.md). The critical decisions are:

1. Keep cumulative XP canonical and derive level from fixed cumulative thresholds.
2. Use a monotonic accumulated active-play clock for timed effects; pause never advances that clock.
3. Preserve one authoritative state aggregate and explicit pure transition ordering rather than
   duplicating rules in the session manager or browser.
4. Add one exact-body purchase action; keep shop visibility client-local and all purchase outcomes
   authoritative.
5. Expand one strict snapshot shape atomically because server and client ship together; retain
   revision ordering and reject unknown or inconsistent data.

## Phase 1 — Design

### Domain state and transitions

- Add fixed feature constants and pure helpers in `src/game/runFeatures.ts`: XP award, cumulative
  thresholds, derived level, perk costs/caps, atomic purchase result, spawn chance/type/cell, effect
  activation/refresh, and effective tick interval.
- Extend `GameState` with progression, perks, board powerup, active effects, and accumulated active
  play as described in [data-model.md](data-model.md). `level` is derived, not independently mutable.
- Extend the pure step transition to accept the settled active-play time and use injected randomness.
  It expires effects, resolves the intended move, resolves collision defense, applies pickups/food
  awards, replaces food, attempts a spawn, and establishes win status in one documented order.
- Use Shield before life. Shield cancellation leaves spatial state unchanged and resets a colliding
  queued direction to the last committed direction so the player can steer safely. Life recovery uses
  the validated starting formation, resolves item conflicts, clears temporary effects, and retains
  permanent run values and score.

### Session timing and API

- Inject a monotonic `nowMs()` source into `GameSessionManager` alongside random/id sources. Store
  accumulated active-play milliseconds in game state and private `playingSinceMs` only while playing.
  Settle elapsed play before ticks and pause; resume starts a new active interval.
- Compute scheduling through the normal score pace and Speed Boost modifier. No effect has an
  independent timer, so pause/restart/close cannot leave orphan callbacks.
- Add `purchasePerk` to the manager and one `POST /api/games/:gameId/perks` route with exact body
  `{ "perk": "luck" | "extra_xp" | "extra_life" }`. Return typed 400/404/409 errors specified in
  [contracts/game-api.md](contracts/game-api.md); rejected requests never publish or increment
  revision.
- Continue broadcasting the complete snapshot after every accepted transition or purchase.

### Snapshot and browser presentation

- Expand `PlayerState` with `progression`, `perks`, and `effects`; expand container state with nullable
  `powerup`. Validate exact keys, integer/range/cap constraints, unique/in-bounds occupancy, effect
  values, and `level === deriveLevel(xp)` before accepting a snapshot.
- Add `purchasePerk` to the browser API wrapper. Keep purchase errors in the shop instead of reporting
  expected 4xx/409 responses as a server outage.
- Add semantic XP/level/points and cube HUD nodes plus an accessible paused shop view with current
  values, next costs, plus controls, a purchase-status live region, and Resume. S and a visible SHOP
  control open/toggle the view; other resume paths close it. Global shortcuts ignore interactive
  controls so Space/Enter can activate purchase buttons normally.
- Render each board powerup with a distinct text/shape and color class while preserving the retro
  style, small-screen layout, focus indicators, and reduced-motion behavior.

### Verification and delivery

- Follow the frozen scenarios in [quickstart.md](quickstart.md) and task evidence before editing code.
- Implement test-first at each story boundary: pure rules, engine transitions, session timing,
  HTTP errors, strict snapshots, then client/manual flows.
- Run `npm run typecheck`, `npm test`, `npm run build`, and `git diff --check`; record exact results in
  `docs/tracking/evidence/EVIDENCE_006.md` and summarize them in the work/AI usage logs.
- Update `docs/specs/GAME_SPEC.md` before behavior implementation so the accepted feature explicitly
  supersedes its prior level/powerup/life exclusions. Preserve `docs/specs/TOOL_CONTRACT.md` unchanged.
