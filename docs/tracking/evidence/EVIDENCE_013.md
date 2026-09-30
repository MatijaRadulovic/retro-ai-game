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

| ID | Scenario | Expected | Result |
|---|---|---|---|
| M1 | Start, open SHOP, press ASK SHOP AI | Pending "CHECKING…", then BUY/WAIT advice with a model label | PASS |
| M3 | Same request; Flash returns 503 | UI shows the fallback model (GEMINI FLASH-LITE); telemetry: Flash failure 503, then Flash-Lite success with `fallbackUsed: true` | PASS |
| M2 | Compare score, XP, perk points and perk levels before/after advice | Unchanged; game stays paused — advice never buys | PASS |
| M4 | ASK SHOP AI, then CLOSE SHOP before the answer | Shop hidden, game resumes, late answer never shown | PASS |
| M4b | Backend request aborted by the client after 300 ms | Provider attempt ends as `cancelled`; no successful answer | PASS |
| M5 | Buy a perk while advice is pending | Stale answer discarded | SKIP — a fresh run has no affordable perk; the stale-revision discard is covered by `tests/shopAdvice.test.ts` |
| M6 | No provider configured | "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."; state unchanged | PASS |

Run on 2026-09-30: `6 passed, 1 skipped, 0 failed`.

**Finding from M4:** the browser aborts its request on close, and the backend cancels provider work when its client disconnects (M4b). The Vite dev/preview proxy, however, does not forward that abort to the backend: behind the proxy the Flash-Lite call still completed. The UI still discards the answer, so correctness and state safety hold, but one provider call is spent. This affects the local Vite proxy only; a production deployment should put the backend behind a proxy that propagates client disconnects.

## Live provider

The live Gemini path (real Flash 503 followed by a valid Flash-Lite answer) is recorded in [Evidence 012](EVIDENCE_012.md) and was not repeated here.

## Honest limitations

S1–S3 ran against the real HTTP server; M1–M6 ran in headless Chromium against the real server and client with a fake provider, not against live Gemini. M5 was skipped as noted.
