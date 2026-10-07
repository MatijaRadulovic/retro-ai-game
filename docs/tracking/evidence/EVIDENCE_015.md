# Evidence 015 — Initial server connection recovery

## Record and task context

- **Purpose:** diagnose the reported slow/offline startup and recover when the page loads before the backend is available.
- **Governing contract:** `AGENTS.md`; `docs/instructions/01-project-architecture.md`, `02-code-conventions.md`, `04-testing-and-verification.md`, and `05-workflow-tracking-and-reporting.md`.
- **Prompt:** current user request; no standalone prompt artifact.
- **Starting state:** dirty W05 working tree on 2026-10-07; preserve all existing changes. Sources inspected: `src/main.ts`, `src/api/gameClient.ts`, `vite.config.ts`, `scripts/e2e/shopAdvisor.e2e.ts`.
- **Scope:** client startup connection only. No server or AI change.

## Baseline and frozen scenarios

Both local services listened on ports 3001 and 5173. Direct and Vite-proxied `/api/health` returned HTTP 200. Proxied `POST /api/games` returned HTTP 201, and the proxied WebSocket opened and delivered an initial `ready` snapshot. A headless browser reached `SERVER ONLINE` in 224 ms with both services ready.

| ID | Scenario / expected result | Before | After |
|---|---|---|---|
| C1 | Ready backend: browser reaches `SERVER ONLINE` promptly | 224 ms in one browser probe | Passed: 264 ms in a fresh browser probe |
| C2 | First game creation network request fails, then backend is reachable: page retries and reaches `SERVER ONLINE` without reload | Failed: forced first POST abort; after 1.2 s page showed `SERVER OFFLINE`, one POST attempt | Passed: E2E `STARTUP-RETRY`, two POST attempts and `READY`/online without reload |
| C3 | Persistent initial transport failure: page shows a waiting/reconnecting state and retries at a bounded interval | Failed: terminal `SERVER OFFLINE` after first failure | Passed: forced every POST to fail; after 2.7 s page showed `RECONNECTING` and three attempts |
| C4 | Invalid server response: surface failure instead of retrying an invalid contract indefinitely | Existing `GameApiError` invalid response path; not exercised in browser baseline | Passed: forced HTTP 201 `{}`; after 1.2 s page showed `SERVER OFFLINE` and one attempt |

## Controlled change — iteration 1

- **Hypothesis:** `initializeGame` attempts game creation once. A failed request during the Vite/backend startup gap becomes a terminal UI error even though the backend appears later.
- **Planned change:** retry only initial transport failures with bounded backoff; show a waiting state; guard against overlapping attempts; keep nontransport errors visible.
- **Files changed:** `src/main.ts` and `scripts/e2e/shopAdvisor.e2e.ts`. The client now retries initial transport failures with delays of 0.5, 1 and up to 2 seconds. The initial valid snapshot plus the WebSocket subscription provide current state, so the redundant initial GET was removed; this also prevents a transient GET failure from overwriting a successful socket connection with `SERVER OFFLINE`.

## After verification

- `npm run typecheck`: exit 0.
- `npm test`: exit 0, 91/91 tests passed.
- `npm run build`: exit 0; Vite built 10 modules.
- `npm run test:e2e`: exit 0, 10/10 browser scenarios passed, including `STARTUP-RETRY` and existing shop/life-plan regressions.
- One-off headless Chromium probes: C1 264 ms to online; C3 `RECONNECTING` with three attempts after 2.7 s; C4 `SERVER OFFLINE` with one attempt after 1.2 s.
- `git diff --check`: exit 0.
- `npm run security:scan` and pre-push hook: skipped because no security-boundary changes or push occurred. No live provider call was made.

## Limitations

The forced request abort reproduces a transport failure in the browser. It does not measure the user's exact startup sequence or machine load.
