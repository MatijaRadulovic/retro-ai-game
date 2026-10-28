# Quickstart: Validate Secure Agent Boundaries

This is a planned reproducible validation guide. Do not mark a scenario passed until its command and observed output are recorded in `EVIDENCE_W08.md`.

## Prerequisites

- Node.js 22 or newer.
- Project-local dependencies installed from the lockfile.
- No live provider key is required. Use deterministic fake transports only.
- Never open secret files. The only test marker is `W08_SERVER_SECRET_DO_NOT_EXPOSE` inside a dedicated fixture/runtime variable.

## Baseline gates

Run separately so one failure does not hide later status:

```sh
npm run typecheck
npm test
npm run build
npm run security:scan
npm audit --json
git diff --check
```

Current review note: on 2026-10-28 typecheck was blocked by a missing project-local install/incompatible parent TypeScript environment. Restore the documented toolchain and record the new result; do not rewrite tests around the blocker.

## Focused security suite

The implementation phase should add one documented offline command, for example `npm run test:security`, covering:

1. A/B session ownership for HTTP, both AI routes and WebSocket.
2. Strict media/body/schema and zero provider/tool counters on early denial.
3. Per-session/global rate, active-run, game and subscription limits with fake clock.
4. Deadline/cancel/late-provider tracker and exact lease release.
5. Unknown/inherited/write tool, invalid args/scope, normalized result and grounded final facts.
6. Prompt-injection/malicious provider path and state invariance.
7. Exact security events, log-forging fixture and sentinel absence.

Expected aggregate: no network call to Google, every negative case has explicit provider/tool/state assertions, and the normal W05 fake flow still has at least two model steps and one real allowed tool.

## Production browser proof

1. Build the client.
2. Start the fake backend with the synthetic sentinel loaded but never exposed.
3. Serve `dist/` through the configured production preview headers, not dev/HMR.
4. Run Playwright against that preview.
5. Independently serve a cross-origin JavaScript marker that returns HTTP 200; prove reachability outside the protected page, then prove the page's CSP blocks it by the relevant directive.

The browser scenario must assert:

- CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer` are response headers.
- Game creation, WebSocket, pause/shop, and fake Shop Strategist success still work.
- The agent performed at least two model decisions and one allowed tool execution.
- XSS/HTML/URL/bidi fixtures create no `script`, `img`, active link, event-handler attribute or marker effect.
- `Čuvaj igračeve poene: a < b.` renders correctly.
- The controlled cross-origin script is blocked by CSP, not by 404 or a skipped request.

## Sentinel proof

Search the synthetic value, not merely its variable name, in:

- `dist/` and any source maps;
- captured public responses/headers;
- captured model request/context;
- normalized tool transcript;
- captured security-event lines.

Expected occurrences: zero. Separately assert the fake server loaded the exact sentinel through a boolean/status internal test without printing it. This proves one regression marker only, not general data-loss prevention.

## Required comparison scenarios

Use the same fixture before and after each controlled change:

| Scenario | Baseline expectation | Hardened expectation |
|---|---|---|
| T03 A requests B game/agent/WS | Current code has no ownership barrier | Uniform deny; provider/tool 0; B unchanged |
| T13 parallel runs across game IDs | Current per-game set allows cross-game parallelism | Per-session 1/global 2; excess early deny; later success |
| T09/T10 malicious proposal/result | Current allowlist blocks tool, but full normalized/grounded chain incomplete | Forbidden execution 0; raw result absent; grounded final only |

## Full delivery proof

- Complete T00–T17 plus CSRF applicability/result table.
- Run the configured `.githooks/pre-push` before push.
- Record dependency package/version/advisory/exposure/decision.
- State single-process, restart, no-login and fake-provider limitations.
- Do not claim live model quality, durable identity, distributed limiting or general secret scanning.
