# Implementation Plan: Secure Agent Boundaries

**Branch**: `004-secure-agent-boundaries` (SpecKit logical feature; current git branch remains `main`) | **Date**: 2026-10-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-secure-agent-boundaries/spec.md`

## Summary

Harden the existing no-login, single-player Shop Strategist path in three controlled slices: (1) server-issued session scope and resource ownership across HTTP, WebSocket, agent, and tools; (2) shared process-local rate, concurrency, game, subscription, and cleanup governance; and (3) normalized tool data, grounded final evidence, adversarial provider/injection proof, browser security headers, and minimal structured security events. Preserve the current server-authoritative game, fixed read-only tool allowlist, approved Google model chain, and deterministic fake-provider W05 success path.

## Technical Context

**Language/Version**: TypeScript 5.7-compatible source; Node.js 22+ runtime (current review host reported Node 24.20.0)

**Primary Dependencies**: Existing Node HTTP server, `ws`, Vite, Playwright, TypeScript; Node built-in `crypto`; no new runtime dependency planned

**Storage**: Process-local `Map`/bounded arrays only; no database; session hashes, games, rate windows, run leases and history are lost on restart

**Testing**: `node:test`/`node:assert`, deterministic fake provider and fake clock; Playwright against built Vite preview; existing security scan and dependency audit

**Target Platform**: Local browser + single TypeScript Node process on loopback; production-preview security profile served locally

**Project Type**: Browser client plus HTTP/WebSocket backend

**Performance Goals**: Admission checks are synchronous bounded operations; at most 2 active agent runs, 100 games and 100 subscriptions per process; no unbounded per-session queues

**Constraints**: No login/accounts/database/new provider/write tool; exact W05 two-step/one-tool success remains; no secret-file access; server-only key; body 16 KiB, provider payload 16 KiB, model text 4,096 chars, tool result 4 KiB, run deadline 45 s

**Scale/Scope**: One local process, temporary no-login sessions, multiple independent single-player games; explicit non-support for distributed/public production security

## Constitution Check

*GATE: Passed before Phase 0 and re-checked after Phase 1.*

| Principle | Gate result | Design evidence |
|---|---|---|
| I. Server-authoritative state | Pass | Owner scope, admission, rate, tool grounding and lifecycle live on backend; browser sends intent/verifier only |
| II. Validate every trust boundary | Pass | Strict media/body/session/origin, parsed tool DTOs, grounded final facts, exact events and client response validation |
| III. Small, original, scoped | Pass | Existing stack; no accounts, DB, provider, tool expansion or broad framework refactor |
| IV. Verification and evidence | Pass | T00–T17/CSRF mapping, frozen pre/post scenarios, fake clocks/providers, browser production proof, honest baseline blocker |
| V. Narrow read-only AI boundary | Pass | Same three models and three read-only tools; no state mutation or arbitrary provider/tool; secret remains server-only |

Post-design re-check: all gates still pass. New session/governor/event modules are small owning boundaries justified by cross-route invariants; no constitution exception is required.

## Project Structure

### Documentation (this feature)

```text
specs/004-secure-agent-boundaries/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── checklists/requirements.md
└── contracts/
    ├── session-access-api.md
    └── agent-assurance-events.md
```

### Source Code (repository root)

```text
server/
├── security/
│   ├── sessionStore.ts          # opaque no-login scope, hash, verifier and expiry
│   ├── resourceGovernor.ts      # rolling windows, caps and idempotent leases
│   └── securityEvents.ts        # exact-schema event factory/sink
├── httpServer.ts                # ordered HTTP/WS admission and safe status mapping
├── gameSession.ts               # internal owner, activity, destroy/cleanup and owned access
└── agent/
    ├── shopAgent.ts             # authorized admission lease and pending-work tracker
    ├── orchestrator.ts          # immutable scope, parsed tool results and correlation context
    ├── tools.ts                 # argument parsers and normalized result parsers
    ├── finalResult.ts           # fact reference validation and application wording
    ├── prompt.ts                # revised structured evidence protocol
    └── types.ts                 # bounded DTOs and internal run context

src/
├── api/gameClient.ts            # bootstrap, verifier header and WS subprotocol
├── ai/shopAgent.ts              # public grounded-result validator
└── main.ts                      # expiry UX and plain-text display

scripts/e2e/
└── secureArcade.e2e.ts          # built-preview headers, DOM, CSP and normal flow

tests/
├── sessionSecurity.test.ts
├── resourceGovernor.test.ts
├── securityEvents.test.ts
├── agentHttp.test.ts
├── agentTools.test.ts
├── agentFinal.test.ts
├── agentOrchestrator.test.ts
├── agentReliability.test.ts
├── httpServer.test.ts
└── gameSession.test.ts
```

**Structure Decision**: Retain the current flat browser/server repository. Add only three focused backend security modules because the same session, capacity and event rules must be shared by HTTP, WebSocket, game containers and agent admission.

## Design Phases and Dependency Order

### Phase A — Freeze evidence and restore a reproducible baseline

1. Create `EVIDENCE_W08.md` from the evidence template; record checkpoint and the current typecheck toolchain blocker without marking tests/build passed.
2. Freeze T00–T17 plus CSRF expectations and choose T03, T13 and T09/T10 as the three before/after comparisons.
3. Restore project-local dependency installation/toolchain in a separate controlled setup step; rerun typecheck/test/build without changing assertions.
4. Review the reported Vite/source-map advisories and record actual exposure/decision before any upgrade.

**Gate:** Baseline commands have real exit status; normal fake W05 fixture is captured or explicitly blocked.

### Phase B — Session bootstrap and ownership (Priority 1)

1. Add `SessionStore` with random opaque token, stored hash, internal scope, verifier, expiry and injected clock/randomness.
2. Add session bootstrap response/cookie and strict content-type/body/origin handling.
3. Add internal owner scope to games and owned access methods; never serialize owner/session fields.
4. Apply ordered request context checks to every game GET/POST, both AI routes, and WebSocket upgrade/subscribe.
5. Pass immutable authorized scope to Shop Agent/orchestrator; re-check owned current snapshot/history before each tool execution and final acceptance.
6. Update client bootstrap, verifier header and WebSocket subprotocol; keep both values out of localStorage and URLs.

**Tests first:** missing/malformed/expired/mixed credentials; A→A positive and A→B/unknown indistinguishable denial across every route; WS origin/subprotocol; media type; oversize; no provider/tool/state effect.

**Gate:** T01–T03, T08 and CSRF pass with positive controls; W05 normal path still succeeds.

### Phase C — Resource governor and lifecycle (Priority 2)

1. Implement synchronous rolling-window and cap acquisition with idempotent leases and injected monotonic clock.
2. Enforce game/session/process caps at create; add last authorized activity, pin/subscription counts, destroy and timer cleanup.
3. Acquire WebSocket capacity before `handleUpgrade`; release once on failure/close/error/shutdown; add ping/pong liveness.
4. Acquire per-session/global agent rate and concurrency before provider work. Rate rejections do not acquire capacity; accepted requests consume their timestamp even when cancelled.
5. Track raw provider promises; seal at run end and release run capacity only after all started work settles. Never use a late result.
6. Add lazy and periodic cleanup; do not expire subscribed/pinned/active resources.

**Tests first:** exact window edges, new game same scope, new scope global limit, concurrency maximum, double release, ignored abort/late success, game/subscription cap, expiry/pin behavior and later legitimate success.

**Gate:** T11–T13 and T17 pass; measured maximums match configuration and counters never underflow.

### Phase D — Normalized tools and grounded final (Priority 3a)

1. Replace boolean result validation with strict parsers that build fresh DTOs. Check raw and normalized byte limits.
2. Remove free-form tool effect prose from the model transcript; use structured effect codes/values.
3. Replace final `finding` prose with source-specific fact references and optional allowlisted summary code.
4. Resolve every evidence fact against the cited normalized transcript entry and generate display text locally.
5. Centralize NFC/plain-text policy and preserve positive Serbian/`a < b` fixtures.
6. Keep plan equality, revision, paused state, allowlist, exact envelope and read-only state checks.

**Tests first:** fabricated cited fact, wrong source/fact pair, secret/additional/prototype field, oversized normalized result, injection text, inherited/write/network/file tool and state invariance.

**Gate:** T06–T10 pass; accepted evidence is 100% application-grounded.

### Phase E — Security events and browser production proof (Priority 3b)

1. Generate correlation ID at HTTP entry and pass it through admission and agent context.
2. Emit exact events for admission/access/limit/tool/provider/completion with enumerated reasons and bounded counters; remove nested/free-form operational data.
3. Add production-preview CSP, `nosniff` and `no-referrer`, keeping script/connect policies minimal and functional.
4. Extend deterministic fake backend for Strategist and synthetic sentinel; never log or return the sentinel.
5. Add Playwright built-preview scenario: normal game/WS/shop/agent, XSS/URL/bidi DOM assertions, accessible cross-origin 200 script blocked by named CSP directive, header assertions.
6. Scan `dist`, source maps if any, public responses, captured model requests and event lines for the sentinel.

**Gate:** T04, T05, T14 and T16 pass with positive controls; event line count/schema is deterministic.

### Phase F — Full evidence and delivery

1. Run `npm run typecheck`, `npm test`, `npm run build`, the W08/browser suite, `npm run security:scan`, `npm audit --json`, `git diff --check`, Markdown link scan and `.githooks/pre-push` before push.
2. Populate observed T00–T17/CSRF results and the same three pre/post scenarios in `EVIDENCE_W08.md`.
3. Record dependency decisions, single-process/reset limitations, fake-vs-live boundary and manual browser status.
4. Update the W05/W08 contracts, work log and AI usage record without duplicating evidence.

**Gate:** Every completion claim links to actual output; skipped checks include a reason; no secret or private token is present.

## Test Strategy

- **Unit:** token hashing/expiry, exact parsers, window edges, lease idempotency, fact resolution, event schema, text policy.
- **Integration:** two real session contexts over HTTP, all game routes, Shop Strategist fake transport, provider/tool counters, WebSocket authorization/capacity and late-result behavior.
- **Browser:** built preview only for T04/T05/T16; real DOM and CSP event, normal WebSocket and agent interaction.
- **Regression:** existing engine, game session, W04 advisor and W05 fake suites remain; no test weakened or removed.
- **Security:** sentinel, log-forging fixture, inherited property names, direct HTTP, cross-origin, oversized body/output and dependency audit.

## Rollback and Failure Policy

- Each priority is a controlled iteration with unchanged frozen scenarios. If a phase breaks the normal game/W05 flow, stop and fix that phase before proceeding.
- Invalid/expired session causes safe re-bootstrap/new game UX; no automatic replay of mutations.
- Governor/event sink failure fails closed for resource admission where safety depends on it; diagnostic sink output failure must not change an already-made game/agent decision.
- No fallback to anonymous access, arbitrary model, raw tool result, unsafe HTML, or unbounded work.

## Complexity Tracking

No constitution violation. Three small shared modules avoid duplicated and inconsistent cross-route controls. Durable/distributed infrastructure is deliberately excluded.
