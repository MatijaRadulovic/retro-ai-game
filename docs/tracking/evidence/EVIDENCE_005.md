# Evidence 005 — Server-authoritative Refactor

## Record and task context

- **Purpose:** record the server-authority refactor as a bounded project change, including baseline, evals, actual verification, and limits.
- **Governing specs:** [Refactor plan](../../specs/REFACTOR_PLAN.md) owns architecture decisions, task checklist, Definition of Done, and planned verification. [Game specification](../../specs/GAME_SPEC.md) owns enduring game behavior and product-level DoD. [Tool contract](../../specs/TOOL_CONTRACT.md) owns the Hint boundary.
- **Prompt artifact:** [Week 4 server refactor prompt](../../prompts/week4/BUILD_PROMPT_SERVER_REFACTOR.md).
- **Prompt version limitation:** the archived prompt is linked exactly as used, but it has no explicit version header; do not imply that the current template existed when it was authored.
- **Sources used:** current user request and clarification; project instructions; listed specs/prompt; current source and tests; earlier [core evidence](EVIDENCE_003.md) and [Hint evidence](EVIDENCE_004.md).
- **Conflict priority:** current user request and clarification changed the former browser-only/backend prohibition; other project scope and security rules remained in force.
- **Excluded:** powerups, lives, obstacles, alternate maps, multiple players in one game, room/join flow, authentication, database, deployment, and live AI.
- **Starting state:** browser owned `GameState` and its timer. The working tree already contained modified/deleted/untracked documentation before this task; those pre-existing changes were preserved.
- **Scope:** one controlled architecture change: move game authority/timing to a local Node server, add API/WebSocket snapshots, and make the browser render server snapshots and submit actions.

## Baseline

The starting implementation was browser-authoritative and had no server game containers, HTTP game API, or WebSocket snapshots. Earlier Snake and Hint behavior is documented in Evidence 003 and 004.

No pre-refactor command output or immutable source revision was captured for this task. Therefore there is no direct baseline run of the exact E005 suite. Historical core cases C1–C4 from Evidence 003 are the only comparable baseline. Do not reconstruct a baseline from the after run. New server/API/WebSocket cases were not applicable before the change.

## Frozen evaluation scenarios and before/after results

| ID | Scenario | Expected result | Before refactor | After refactor | Evidence / result |
|---|---|---|---|---|---|
| R1 | Core Snake start, movement, collision, config fallback, and food/growth | Preserve game rules | Historical PASS for frozen C1–C4 in Evidence 003; no immediate pre-run | PASS in 26-test suite | Core game tests listed in actual output below |
| R2 | Create independent game containers | Each container has isolated single-player state | N/A; feature absent | PASS | Manager and HTTP API tests listed below |
| R3 | Valid/invalid actions, config, and unknown IDs | Valid actions transition state; invalid input returns stable safe errors without unintended mutation | N/A for API contract | PASS | Manager/API tests listed below |
| R4 | WebSocket initial and changed snapshots | Client receives authoritative snapshots after connect and transitions/ticks | N/A; feature absent | PASS | `WebSocket sends initial and changed authoritative snapshots` |
| R5 | Browser renders server state, submits controls, and Hint stays read-only | UI reflects server snapshots; Hint cannot mutate game | Browser owned state before refactor; exact baseline run not preserved | PASS (user-reported) | User reports manual check passed; no individual scenarios supplied. API/protocol and read-only Hint tests also pass. |
| R6 | Required typecheck, test, and build commands | All required project checks succeed | Not captured immediately before change | PASS | Actual outputs below; 26/26 tests |

These expectations are frozen for future follow-up iterations unless a spec change is explicitly recorded. For this historical refactor, only R1 has an earlier comparable result. The final suite is not a reconstructed baseline.

## Controlled change

The implementation added isolated in-memory game containers, HTTP actions, WebSocket snapshot delivery, and a browser client that renders validated server state. Existing local mock Hint remains read-only. No room/join flow, multiplayer participation, persistence, live AI, or deployment was added. The detailed scope and task checklist are in the linked prompt and refactor plan.

## After verification

### Automated tests and build

```text
$ npm run typecheck
> tsc -p tsconfig.json --noEmit
exit status: 0

$ npm test
> npm run typecheck && node --test tests/*.test.ts
✔ snapshot protocol accepts authoritative snapshots and rejects malformed data
✔ manager creates isolated one-player game containers
✔ valid move starts server state and advances; reverse moves are ignored
✔ server schedules authoritative movement using the configured tick speed
✔ pause, resume, and restart preserve the session while resetting game state
✔ invalid session actions return a typed error without creating a session
✔ invalid runtime config uses the existing visible safe fallback
✔ valid AI hint request executes the read-only tool once and returns a validated response
✔ get_game_state exposes no body data and does not mutate the game
✔ invalid arguments are blocked before the tool executes
✔ unsupported tool names are blocked before the tool executes
✔ a malformed read-only tool result cannot become a hint
✔ provider failure returns a controlled safe error
✔ a malformed final response is rejected instead of being shown
✔ HTTP API creates independent games and exposes server-owned actions
✔ HTTP API rejects malformed requests and missing game IDs safely
✔ WebSocket sends initial and changed authoritative snapshots
✔ runtime config accepts the default and explicitly falls back when invalid
✔ initial snake has three segments and food is outside its body
✔ new game waits for a valid direction before movement starts
✔ pause freezes the game until it is resumed
✔ speed increases after each configured score milestone without crossing the safe minimum
✔ opposite direction is rejected
✔ eating food increases score and snake length
✔ wall collision ends the game
✔ self collision ends the game
ℹ tests 26
ℹ pass 26
ℹ fail 0
exit status: 0

$ npm run build
> tsc -p tsconfig.json && vite build
vite v6.4.3 building for production...
✓ 8 modules transformed.
dist/index.html                  2.95 kB │ gzip: 1.05 kB
dist/assets/index-CCv4suwW.css   7.73 kB │ gzip: 2.38 kB
dist/assets/index-xWqH-RUm.js   14.53 kB │ gzip: 5.42 kB
✓ built in 462ms
exit status: 0

$ git diff --check
no output; exit status: 0

$ focused Markdown link scan
All checked Markdown links resolve.
exit status: 0
```

### Local proxy smoke check

The dev backend and Vite were started in separate processes. `http://127.0.0.1:5173/api/health` returned:

```text
HTTP/1.1 200 OK
content-type: application/json; charset=utf-8
{"status":"ok"}
```

The built preview `/api/health` endpoint at `http://127.0.0.1:4173/api/health` also returned HTTP 200 with `{"status":"ok"}`.

### Manual browser check

The agent could not inspect the browser because no in-app browser surface was available (`agent.browsers.list()` returned `[]`). On 2026-09-29, the user reported manually checking the game and that everything works. No individual scenarios or observations were supplied, so this is recorded as user-reported verification rather than an agent-observed browser result. Automated API, protocol, game, and WebSocket tests passed; proxy health was checked separately.

## Honest limitations

- There is no exact pre-refactor test run, so R1 has only historical baseline comparison and R2–R4 are new-capability after-only checks.
- Manual verification is user-reported; no per-scenario observation log was supplied.
- Game containers live in process memory and are lost when the server restarts.
- Each container has one player; there is no room/join endpoint or multiplayer participation.
- The local Hint uses the fake model only; no live AI provider or persistence was added.
