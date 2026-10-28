# Tasks: Secure Agent Boundaries

**Input**: Design documents in `specs/004-secure-agent-boundaries/` (`spec.md`, `plan.md`, `research.md`, `data-model.md`, contracts, `quickstart.md`)

**Prerequisites**: SpecKit planning artifacts and W08 frozen expectations are present. Application implementation MUST NOT begin until Phase 1 baseline is recorded and the Foundational gate is closed.

**Tests**: Tests are required by FR-033, the constitution, and the user request. For each implementation slice, write the listed tests first, run them and capture the expected failing result, then implement. Never weaken an existing test to obtain a pass.

**Task format**: Every task has an ID, checkbox, exact repository path(s), and W08 scenario or command reference. `[P]` means it can proceed in parallel without editing the same file or depending on an unfinished task. `[US1]`–`[US3]` map to the spec's user stories.

## Current execution slice (user-selected)

Prioritize the three risk areas and their BEFORE/AFTER proof: (1) US1 session/request ownership, (2) US2 per-scope and process resource governance, and (3) US3 tool-output/model/final-result assurance. The user-selected verifier is held only in current-tab `sessionStorage`, which survives reload and clears at tab close. T03, T13, and T09/T10 BEFORE probes are now recorded; before the first application edit, complete foundational tasks T005–T008, then execute T009–T048 in dependency order. Keep the normal W05 path and canonical game-state assertions. Repeat the exact three frozen scenarios AFTER and record both columns in `docs/week8/EVIDENCE_W08.md`. Pause after the three story gates; T049–T056 (full assignment closeout, audit decision, complete handoff and demo) remain for a later phase.

## Phase 1: Setup and baseline

**Purpose**: Reproduce the existing project baseline and preserve the before state before any application change.

- [x] T001 Install project-local dependencies from `package-lock.json` with `npm ci`; record Node/npm versions and verify the lockfile is unchanged.
- [x] T002 Run `npm run typecheck`, `npm test`, `npm run build`, and `npm run security:scan` separately; record exact output/status in `docs/week8/EVIDENCE_W08.md`.
- [x] T003 Run the deterministic W05 HTTP success fixture in `tests/agentHttp.test.ts`; record model-step count, allowed-tool count, status, and the actual before/after state assertion in `docs/week8/EVIDENCE_W08.md` (T00 / BEFORE).
- [x] T004 Run `npm audit --json` using `package-lock.json`; record package/version/advisory/runtime-or-dev/exposure/decision in `docs/week8/EVIDENCE_W08.md` without a forced bulk upgrade. Decision: findings remain open for compatibility/exposure review; no forced upgrade.

**Gate**: Baseline commands have actual outcomes and the normal W05 fake path is recorded, or a reproducible blocker and next action are documented. No hardened behavior may be credited to this baseline.

---

## Phase 2: Foundational (blocks all implementation stories)

**Purpose**: Freeze shared constants, deterministic test dependencies, evidence capture rules, and cross-story integration assumptions.

- [ ] T005 Define fixed server-owned security limit types/constants in `server/security/securityLimits.ts`; match the exact values in `specs/004-secure-agent-boundaries/spec.md` and expose no client-controlled overrides.
- [ ] T006 [P] Add deterministic fake-clock and fake-provider helpers in `tests/helpers/securityFixtures.ts`; keep live provider credentials and network access out of the helper.
- [ ] T007 [P] Add shared assertions for provider calls, tool executions, canonical snapshot equality, and event capture in `tests/helpers/securityAssertions.ts`.
- [x] T008 Reconcile exact task/test command ownership for T00–T17 and CSRF in `docs/week8/EVIDENCE_W08.md`; preserve every observed result as `NOT RUN` until executed.

**Gate**: Shared tests can inject time/provider behavior and measure side effects. All limits match the normative spec and the W08 evidence matrix.

---

## Phase 3: User Story 1 — Play and analyze only my session (P1, MVP)

**Story goal**: A temporary no-login session can access its own games; direct HTTP, WebSocket, and agent requests cannot access another session's data or start protected work without valid request context.

**Independent test**: Run the session/API tests in `tests/sessionSecurity.test.ts`, `tests/httpServer.test.ts`, and `tests/agentHttp.test.ts`; A-to-A positive cases work, while A-to-B/missing/invalid requests are denied before data disclosure, mutation, provider, or tool execution (T01–T03, T08, T15, CSRF).

### Tests first — User Story 1

- [ ] T009 [US1] Add session bootstrap, cookie/verifier, malformed/expired session, constant-time verifier, 101st active session, and 21st issuance within 60 seconds tests in `tests/sessionSecurity.test.ts` (T03, T17, CSRF).
- [ ] T010 [P] [US1] Add HTTP media-type, body-byte-limit, exact JSON shape, privilege-field, origin, verifier, and zero-provider/tool admission tests in `tests/httpServer.test.ts` (T01–T03, CSRF).
- [ ] T011 [US1] Add A-to-A/A-to-B ownership tests for snapshot, mutations, W04/W05 agent routes, and hidden-resource response behavior in `tests/sessionSecurity.test.ts` and `tests/agentHttp.test.ts` (T03, T08).
- [ ] T012 [US1] Add WebSocket origin/session/owner denial and positive subscription tests in `tests/sessionSecurity.test.ts` (T03, CSRF).
- [ ] T013 [US1] Add client-tampered localStorage/game-state regression and server-authoritative snapshot assertions in `tests/agentHttp.test.ts` (T15).

### Implementation — User Story 1

- [ ] T014 [P] [US1] Implement opaque server-issued session records, token hashing, verifier lifecycle, expiry, 100-record capacity, 20-successful-issuance rolling 60-second rate, and injectable clock/random source in `server/security/sessionStore.ts` per `specs/004-secure-agent-boundaries/data-model.md`.
- [ ] T015 [US1] Bind each game to exactly one internal owner scope and add owner-checked lookup/destruction without serializing scope data in `server/gameSession.ts`.
- [ ] T016 [US1] Add ordered request context, exact Content-Type/body parsing, origin/verifier policy, correlation ID, stable safe denial mapping, and bootstrap `429 session_rate_limited` / `503 session_capacity_exhausted` responses in `server/httpServer.ts` and `server/security/requestContext.ts`.
- [ ] T017 [US1] Apply owner/session checks to every game, shop, agent, and event route before state access or provider work in `server/httpServer.ts`.
- [ ] T018 [US1] Enforce WebSocket origin, session, owner and verifier checks before upgrade/subscribe in `server/httpServer.ts` and `server/gameSession.ts`.
- [ ] T019 [US1] Pass only immutable authorized scope into agent and tool execution, with no cookie/verifier/owner ID in model context, in `server/agent/shopAgent.ts`, `server/agent/orchestrator.ts`, and `server/agent/tools.ts`.
- [ ] T020 [US1] Bootstrap and send the request verifier from the browser using tab-scoped `sessionStorage` (survives reload, clears on tab close), never `localStorage` or URLs, in `src/api/gameClient.ts` and `src/main.ts`.
- [ ] T021 [US1] Run `npm test` and the focused session/API command; record T01–T03/T08/T15/CSRF actual results and BEFORE/AFTER T03 state/counters in `docs/week8/EVIDENCE_W08.md`.

**Checkpoint**: A-to-A normal game and agent requests work; every A-to-B and missing/invalid-context case denies before private data/provider/tool work. The feature remains no-login and single-player.

---

## Phase 4: User Story 2 — Keep shared AI resources available (P2)

**Story goal**: Per-session and process-wide admission, concurrency, game, subscription, deadline, and cleanup bounds cannot be reset by changing game IDs or creating a new temporary session.

**Independent test**: With the fake clock and delayed fake provider, run `tests/resourceGovernor.test.ts`, `tests/agentReliability.test.ts`, and `tests/sessionSecurity.test.ts`; measured work never exceeds configured limits, denied work starts no provider call, and safe release permits a later request (T11–T13, T17).

### Tests first — User Story 2

- [ ] T022 [US2] Add rolling-window boundary, per-session/global rate, game cap, subscription cap, atomic acquire, and idempotent release tests in `tests/resourceGovernor.test.ts` (T13, T17).
- [ ] T023 [US2] Add delayed-provider concurrency, per-scope/global active maximum, early 429/503 denial, and later legitimate admission tests in `tests/agentHttp.test.ts` and `tests/resourceGovernor.test.ts` (T13).
- [ ] T024 [P] [US2] Add per-call timeout, total deadline, client disconnect race, provider ignoring abort, late-result suppression, and exact cleanup tests in `tests/agentReliability.test.ts` (T12).
- [ ] T025 [US2] Add game/session/subscription expiry, active pin behavior, bounded cleanup, 100-active-session and 20-issuance/60-second process limits, one-subscription-per-game and new-session global-backstop tests in `tests/sessionSecurity.test.ts` and `tests/resourceGovernor.test.ts` (T13, T17).

### Implementation — User Story 2

- [ ] T026 [US2] Implement rolling per-scope/process acceptance windows and idempotent active-run/game/subscription leases with injected monotonic clock in `server/security/resourceGovernor.ts` per `specs/004-secure-agent-boundaries/data-model.md`.
- [ ] T027 [US2] Enforce at most 3 games per scope and 100 per process; add bounded inactivity cleanup, active-run pinning, and exact timer/listener destruction in `server/gameSession.ts` and `server/security/resourceGovernor.ts`.
- [ ] T028 [US2] Acquire WebSocket subscription capacity (maximum one per game, three per scope, 100 process-wide) before upgrade and release it exactly once on close/error/failure in `server/httpServer.ts` and `server/gameSession.ts`.
- [ ] T029 [US2] Acquire the session/process agent budget before provider work; enforce 1 active run/scope, 2 active/process, 5 accepts/scope/60 seconds, and 20 accepts/process/60 seconds in `server/agent/shopAgent.ts` and `server/security/resourceGovernor.ts`.
- [ ] T030 [US2] Track all started provider promises and retain run capacity until safe settlement/cleanup; suppress all post-deadline success in `server/agent/orchestrator.ts` and `server/agent/shopAgent.ts`.
- [ ] T031 [US2] Keep retry/fallback within the shared 8-attempt, 2-fallback, 5-decision, 4-tool, 2-evaluator, 10-second call, 45-second run, 16 KiB provider response, 4 KiB tool result, and 4,096-character model text bounds in `server/agent/orchestrator.ts` and `server/security/securityLimits.ts`.
- [ ] T032 [US2] Run focused governor/reliability tests and `npm test`; record T11–T13/T17 limits, counts, status, cleanup, and BEFORE/AFTER T13 outcomes in `docs/week8/EVIDENCE_W08.md`.

**Checkpoint**: No cross-game or cross-session request resets limits; active maximums and rolling-window values match the spec; rejected requests perform no provider/tool work; every completion/cancel/deadline releases exactly once.

---

## Phase 5: User Story 3 — Receive safe, grounded, auditable advice (P3)

**Story goal**: Only allowed, validated, read-only agent behavior can reach the player; tool facts are normalized and final evidence is grounded; browser output, secrets, errors, and events are safe and testable.

**Independent test**: Run fake-provider tests in `tests/agentTools.test.ts`, `tests/agentFinal.test.ts`, `tests/agentOrchestrator.test.ts`, `tests/securityEvents.test.ts`, then the built-preview Playwright suite. Forbidden proposals produce no effects, invalid/raw results do not reach a later model, fabricated claims fail, and XSS/CSP/sentinel/event assertions pass (T04–T10, T14, T16).

### Tests first — User Story 3

- [ ] T033 [P] [US3] Add exact normalized tool DTO, allowed-field/value/size/scope, prototype-property, and synthetic-secret tests in `tests/agentTools.test.ts` (T07, T08, T10).
- [ ] T034 [P] [US3] Add fabricated fact/source, wrong fact type, application-wording, and ordinary Serbian/`a < b` final-result tests in `tests/agentFinal.test.ts` (T06, T09).
- [ ] T035 [P] [US3] Add end-to-end fake-provider injection, forbidden/write/network/file tool, repeat, invalid-envelope, and canonical-state-invariance tests in `tests/agentOrchestrator.test.ts` and `tests/agentHttp.test.ts` (T06–T11).
- [ ] T036 [P] [US3] Add exact event schema, safe reason enums, redaction, newline/log-forging and one-record-per-event tests in `tests/securityEvents.test.ts` (T14).
- [ ] T037 [P] [US3] Add production-preview browser tests for XSS/HTML/URL markers, CSP violation source, headers, normal game/WS/agent flow, and sentinel absence in `scripts/e2e/secureArcade.e2e.ts` (T04, T05, T16).
- [ ] T038 [US3] Add localStorage/client-state tampering assertions to the browser journey in `scripts/e2e/secureArcade.e2e.ts` (T15).

### Implementation — User Story 3

- [ ] T039 [US3] Replace raw tool-result forwarding with fresh discriminated normalized DTO parsers and enforce raw/normalized byte bounds in `server/agent/tools.ts` and `server/agent/types.ts`.
- [ ] T040 [US3] Replace model-authored evidence claims with validated source/step/fact references resolved into application-owned wording in `server/agent/finalResult.ts`, `server/agent/types.ts`, and `server/agent/prompt.ts`.
- [ ] T041 [US3] Centralize Unicode/plain-text policy for control, bidi, zero-width, HTML, Markdown, and URL-like content while retaining positive Serbian fixtures in `server/agent/finalResult.ts` and `src/ai/shopAgent.ts`.
- [ ] T042 [US3] Preserve the exact Google model chain and three-tool read-only allowlist; ensure validation, authorization, budgets, repeat detection and deadline decisions remain server-owned in `server/agent/tools.ts`, `server/agent/orchestrator.ts`, and `server/agent/shopAgent.ts`.
- [ ] T043 [US3] Add an allowlisted security event union, server-generated correlation IDs, enumerated reasons, bounded counters, and a non-interfering sink in `server/security/securityEvents.ts` and `server/httpServer.ts`.
- [ ] T044 [US3] Route HTTP admission/access/limit denials and agent/tool/provider/completion decisions through the safe event factory without logging raw input or identifiers in `server/httpServer.ts`, `server/agent/shopAgent.ts`, and `server/agent/orchestrator.ts`.
- [ ] T045 [US3] Add production-preview CSP, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: no-referrer` while keeping game/API/WebSocket flow functional in `vite.config.ts` and `scripts/e2e/secureArcade.e2e.ts`.
- [ ] T046 [US3] Extend the offline fake backend to load the synthetic sentinel internally and capture model/tool/response/event channels without printing the marker in `tests/helpers/securityFixtures.ts` and `scripts/e2e/secureArcade.e2e.ts`.
- [ ] T047 [US3] Add a repeatable offline `npm run test:security` command covering HTTP, ownership, governor, agent/tool, event, sentinel, and browser checks in `package.json` and `scripts/e2e/secureArcade.e2e.ts`.
- [ ] T048 [US3] Run focused tests, `npm test`, and `npm run test:security`; record T04–T10/T14/T16, secret scan counts, event outputs, and limitations in `docs/week8/EVIDENCE_W08.md`.

**Checkpoint**: At least two model decisions and one allowed tool still produce grounded safe advice; malicious proposals/data cannot change scope, limits, or game state; browser security behavior is demonstrated against the production preview.

---

## Phase 6: Polish, full evidence, and delivery

**Purpose**: Close every W08 scenario and repeatable handoff gate without overstating what local fake tests establish.

- [ ] T049 [P] Consolidate exact T00–T17 and CSRF test files/commands, dependencies, and automation/manual split in `docs/week8/03-Plan-i-provere-Secure-the-Arcade.md`.
- [ ] T050 Run all `npm run typecheck`, `npm test`, `npm run build`, `npm run test:security`, and `npm run security:scan` commands separately; put actual output/status in `docs/week8/EVIDENCE_W08.md`.
- [ ] T051 Run `npm audit --json`, resolve each relevant dependency advisory with exposure/compatibility evidence, and record any remaining finding in `docs/week8/EVIDENCE_W08.md` and `docs/week8/04-Audit-sest-nepravilnosti.md`.
- [ ] T052 Repeat the exact frozen T03, T13, and T09/T10 fixtures after implementation; compare with their recorded BEFORE values in `docs/week8/EVIDENCE_W08.md`.
- [ ] T053 Complete checkpoint/final commit, environment, test results, production browser smoke, sentinel scan, dependency decision, limitations, and redacted event example in `docs/week8/EVIDENCE_W08.md`.
- [ ] T054 Confirm both members' actual contributions and AI-assisted work/review facts, then update `docs/tracking/AI_USAGE_LOG.md` and `docs/week8/EVIDENCE_W08.md` without inventing individual work.
- [ ] T055 Run Markdown link review, `git diff --check`, and the configured `.githooks/pre-push` guard before any push; record results in `docs/week8/EVIDENCE_W08.md`.
- [ ] T056 Prepare and rehearse the eight-minute demo outline in `docs/week8/03-Plan-i-provere-Secure-the-Arcade.md`; show normal W05 flow, two distinct abuse attempts, test results, comparisons, and production-build protection.

**Final gate**: W08 implementation and evidence satisfy `specs/004-secure-agent-boundaries/spec.md`, every applicable T00–T17/CSRF row has an observed outcome, all automated checks are reproducible offline, and the browser demo retains the normal game and W05 path.

---

## Dependencies and execution order

```text
T001–T004 baseline
  └─ T005–T008 shared test/evidence foundation
      ├─ US1 (T009–T021): session and access boundary
      │    └─ US2 (T022–T032): resource governance
      └─ US3 tests T033–T038 may be prepared after foundation;
         US3 implementation T039–T048 depends on US1 ownership context,
         US2 limits, and its tests
             └─ Polish T049–T056
```

US2 depends on US1 because limits are keyed by a trusted session scope. US3 tool-scope and HTTP integration depend on US1; shared run-budget/event/capacity assertions depend on US2. Browser-only fixture authoring can proceed alongside US2 after T006/T007, but the complete US3 independent gate requires both earlier gates.

## Parallel opportunities

- After T005, T006 and T007 may proceed in parallel because they create separate test helper files.
- After T008, T009–T013 are independent test-first work in separate test files except T011/T013 both touch `tests/agentHttp.test.ts`; split those edits or serialize them to avoid a same-file conflict.
- Within US2, T022 and T024 can proceed in parallel; T023/T025 share test files and should be coordinated. Implementation T026 precedes T027–T030; T031 can proceed once T005 exists.
- Within US3, T033–T036 can proceed in parallel. T037/T038 share `scripts/e2e/secureArcade.e2e.ts` and should be combined/serialized. Implementation T039/T040/T043/T045 are separate modules and may proceed in parallel once their corresponding tests are red; integration tasks T042/T044/T046/T047 depend on them.
- Different user stories are not fully independent: US2 needs US1 scope and US3 protected tool context. Work may parallelize on isolated tests, but do not claim a story's full integration gate before dependencies are complete.

## Independent story test criteria

| Story | Independent pass criteria |
|---|---|
| US1 / P1 | A-to-A game and fake agent path succeeds; A-to-B, missing, expired, malformed, wrong-origin and wrong-verifier requests disclose/mutate nothing and have provider/tool counts 0; WebSocket ownership is checked. |
| US2 / P2 | Fake clock/provider proves exact rolling limits and active maxima, rejects excess before provider work, keeps global limits across new IDs/sessions, releases leases exactly once and admits later valid work. |
| US3 / P3 | Production policy rejects forbidden tools and invalid/raw data; final facts are grounded; no game-state mutation; events and sentinel checks are clean; built-preview browser verifies inert content, CSP/headers, and normal gameplay/agent flow. |

## Parallel example: test-first ownership work

```text
Task T009: session lifecycle tests in tests/sessionSecurity.test.ts
Task T010: request admission tests in tests/httpServer.test.ts
Task T012: WebSocket boundary tests in tests/sessionSecurity.test.ts (coordinate with T009)
```

## Implementation strategy

1. Finish Phase 1 and establish a reproducible baseline; do not implement against an unknown dependency state.
2. Complete shared test helpers, then deliver US1 as the MVP security boundary and validate it independently.
3. Deliver US2 after trusted scope exists; preserve atomic limits and cleanup behavior.
4. Deliver US3 after access and resource gates; retain the exact read-only W05 provider/tool boundary.
5. Complete the full security suite, browser proof, audit decision, evidence, and demo only after the three story gates pass.
