# Evidence 013 — Shop advisor smoke check and manual browser scenario

## Record and task context

- **Purpose / accepted goal:** give reviewers a repeatable check of the shop-advisor flow: a real-server HTTP smoke that was run, and a manual browser scenario with expected results.
- **Governing spec/task plan:** [specs/002-shop-advisor](../../../specs/002-shop-advisor/) (contract, quickstart).
- **Exact prompt artifact and version:** no standalone prompt artifact applies.
- **Starting source/revision:** `main` at `3e17a45`, plus documentation-only changes.
- **Sources actually used:** the running backend (`npm start` equivalent via `tsx server/index.ts`, no `GEMINI_API_KEY`), `server/httpServer.ts`, the API contract.
- **Relevant sources excluded and why:** no live Gemini call was made and no key was used; live provider behavior remains documented only in [Evidence 012](EVIDENCE_012.md).
- **Scope / out of scope:** no code change. Browser UI steps below are a manual procedure and were **not** executed in this record.

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

## Manual browser scenario (not executed here — to run before final sign-off)

Setup: backend with a valid `GEMINI_API_KEY` from hidden input (see README), Vite client, earn at least one perk point.

| ID | Steps | Expected result |
|---|---|---|
| M1 | Open SHOP, press ASK SHOP AI | Pending message; controls still usable; then BUY EXTRA XP / BUY LUCK / BUY +1 LIFE / WAIT with a short reason and model label |
| M2 | After M1, check perk points and score | Unchanged — advice never buys; purchase is a separate click |
| M3 | Force a Flash 503 (offline tests do this; live it needs an overloaded moment) and ask again | Advice still appears, labeled with the fallback model; telemetry shows Flash then Flash-Lite attempt |
| M4 | Press ASK SHOP AI, then close the shop before the answer arrives | Late answer is not shown; game resumes normally |
| M5 | Press ASK SHOP AI, then buy a perk before the answer arrives | Stale answer (older revision) is discarded |
| M6 | Start the backend without a key and ask | "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."; game state unchanged (matches S3) |

Automated coverage for M3–M5 is in `tests/shopAdvice.test.ts` and `tests/httpServer.test.ts`; the manual run confirms the browser wiring only.

## Honest limitations

S1–S3 were executed against the real HTTP server, not a browser. M1–M6 are a procedure with expected results; no results are claimed for them.
