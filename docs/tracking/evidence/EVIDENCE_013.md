# Evidence 013 — Shop advisor smoke check and manual browser scenario

## Record and task context

- **Purpose / accepted goal:** give reviewers a repeatable check of the shop-advisor flow: a real-server HTTP smoke and an automated browser E2E, both executed.
- **Governing spec/task plan:** [specs/002-shop-advisor](../../../specs/002-shop-advisor/) (contract, quickstart).
- **Exact prompt artifact and version:** no standalone prompt artifact applies.
- **Starting source/revision:** `main` at `3e17a45`, plus documentation-only changes.
- **Sources actually used:** the running backend (`npm start` equivalent via `tsx server/index.ts`, no `GEMINI_API_KEY`), `server/httpServer.ts`, the API contract.
- **Relevant sources excluded and why:** no live Gemini call was made and no key was used; live provider behavior remains documented only in [Evidence 012](EVIDENCE_012.md).
- **Scope / out of scope:** no game or advisor code change; adds a fake-provider E2E harness under `scripts/e2e/`. No live Gemini call.

## Baseline

N/A — no code changed; this records a check of the existing behavior.

## Real-server HTTP smoke (executed)

Backend started on `PORT=3917` with `GEMINI_API_KEY` unset; requests made with `curl`.

| ID | Scenario | Expected | Observed |
|---|---|---|---|
| S1 | `POST /api/games/:id/shop-advice` while the game is not paused | 409 `invalid_status` | 409 `invalid_status` — "Shop advice is available only while paused." |
| S2 | Same endpoint with a body field (`{"model":"x"}`) | 400 `invalid_request` (browser may not choose anything) | 400 `invalid_request` — "Shop advice does not accept request fields." |
| S3 | Started game (`move`), then `pause`, then `shop-advice` with `{}` and no key | 200, `status: "unavailable"`, `code: "not_configured"`, no purchase advice | 200 `{"advice":{"status":"unavailable","revision":2,"code":"not_configured","message":"SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."}}` |

Server log contained only the listening line: nothing sensitive was printed.

## Browser E2E (executed, reproducible)

`npm run test:e2e` (`scripts/e2e/shopAdvisor.e2e.ts`) starts the real game server and advisor with a scripted fake provider (`scripts/e2e/fakeAdvisorServer.ts`: Flash throws 503, Flash-Lite answers after 1.5 s; no key, no Google call), starts the Vite client, and drives headless Chromium. One-time setup: `npx playwright install chromium`.

Both servers run as direct children of the current Node binary (`node --import tsx …` and Vite's own CLI entry), not through `npx` or a shell, so the launcher works the same on Windows and macOS/Linux. The API and web ports are picked free at start-up (override with `E2E_API_PORT` / `E2E_WEB_PORT`); Vite's proxy follows `API_PORT`. `stop()` waits for the server process to exit (escalating to SIGKILL after 5 s) before the next server reuses the port.

| ID | Scenario | Expected | Result |
|---|---|---|---|
| M1 | Start, open SHOP, press ASK SHOP AI | Pending "CHECKING…", then BUY/WAIT advice with a model label | PASS |
| M3 | Same request; Flash returns 503 | UI shows the fallback model (GEMINI FLASH-LITE); telemetry: Flash failure 503, then Flash-Lite success with `fallbackUsed: true` | PASS |
| M2 | Compare score, XP, perk points and perk levels before/after advice | Unchanged; game stays paused — advice never buys | PASS |
| M4 | ASK SHOP AI, then CLOSE SHOP before the answer | Shop hidden, game resumes, late answer never shown | PASS |
| M4b | Backend request aborted by the client after 300 ms | Provider attempt ends as `cancelled`; no successful answer | PASS |
| M5 | Buy a perk while advice is pending | Purchase applies; stale answer discarded | PASS — the fake backend runs with `E2E_SEED_PERK_POINTS=1`, which grants 50 XP (level 2, one perk point) on each game's first pause through the real `awardXp`, so a fresh run always has an affordable perk |
| M6 | No provider configured | "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."; state unchanged | PASS |

First run on 2026-09-30 (before the re-review fixes): `6 passed, 1 skipped, 0 failed` — M5 was skipped because a fresh run had no affordable perk.

Re-run on 2026-09-30 after the re-review fixes (macOS, Node 22): `7 passed, 0 skipped, 0 failed`. The same result was obtained with an unrelated process holding port 3001, and no server process was left running afterwards.

**Finding from M4:** the browser aborts its request on close, and the backend cancels provider work when its client disconnects (M4b). The Vite dev/preview proxy, however, does not forward that abort to the backend: behind the proxy the Flash-Lite call still completed. The UI still discards the answer, so correctness and state safety hold, but one provider call is spent. This affects the local Vite proxy only; a production deployment should put the backend behind a proxy that propagates client disconnects.

## Live provider

The live Gemini path (real Flash 503 followed by a valid Flash-Lite answer) is recorded in [Evidence 012](EVIDENCE_012.md) and was not repeated here.

## Honest limitations

S1–S3 ran against the real HTTP server; M1–M6 ran in headless Chromium against the real server and client with a fake provider, not against live Gemini. The Windows launcher/lifecycle fixes were verified on macOS only; the unmodified `npm run test:e2e` still needs to be re-run on the reviewer's Windows environment.
