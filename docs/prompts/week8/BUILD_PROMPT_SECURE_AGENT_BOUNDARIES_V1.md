# Secure Agent Boundaries — priority implementation prompt

**Version:** v1

## Goal

Implement the three selected W08 security priorities in order, preserving the game and read-only W05 Shop Strategist path. Capture and retain BEFORE evidence for T03, T13, and T09/T10, then run the same frozen scenarios AFTER. Stop after the three priority gates; full Week 8 closeout is a later task.

## Context and source priority

1. Current user request and clarifications (no login; verifier in tab-scoped `sessionStorage`, cleared on tab close; 100 active temporary scopes and 20 successful new scope issuances per process per rolling 60 seconds).
2. Project contract in `AGENTS.md` and routing in `docs/INSTRUCTIONS.md`.
3. Normative requirements and exact values in `specs/004-secure-agent-boundaries/spec.md`, `plan.md`, `data-model.md`, contracts, and `tasks.md`.
4. Frozen cases and actual outcomes in `docs/week8/EVIDENCE_W08.md`.
5. Existing TypeScript implementation and tests.

Treat all HTTP, browser, model, tool, and provider values as untrusted. Never inspect secrets or use a live provider.

## Scope and constraints

- Priority 1: server-issued tab-scoped session, strict HTTP/request admission, game ownership across HTTP/WS/agent/tools.
- Priority 2: per-scope and process run/game/session/subscription limits, atomic leases, cleanup, deadlines and abuse backstops.
- Priority 3: closed read-only tool authority, strict and normalized tool results, injection containment, grounded final facts, safe errors/events, and the browser/runtime behavior required by the accepted feature spec.
- Keep the existing game authoritative, no-login, single-player, in-memory and single-process. Keep the exact approved Google model chain and three-tool allowlist.
- Write tests first for the current task slice. Use fake clocks/providers and synthetic values. Do not weaken existing tests.
- Do not implement accounts, durable person identity, database/distributed limits, new providers/tools, live model calls, unrelated refactors, or assignment closeout tasks T049–T056.
- Do not claim a risk is fixed until the corresponding AFTER scenario and required checks have actual recorded output.

## Allowed files

Implementation may edit only the paths already assigned to T005–T048 in `specs/004-secure-agent-boundaries/tasks.md`, plus the corresponding task evidence and tracking entries. Update the governing feature docs only when an accepted requirement is clarified. Do not edit the supplied assignment.

## Acceptance criteria

- T03: a valid tab session can use only its own games; another scope and missing/invalid contexts are rejected before private data, mutation, provider or tool work.
- T13: per-scope rate/concurrency is shared across game IDs; process limits remain effective across new cookie-backed scopes; excess requests are denied before provider work; leases release safely.
- T09/T10: forbidden model proposals never dispatch; tool output is bounded, schema-validated and normalized before another model step; injected text cannot change authority or appear as trusted evidence; final claims resolve to validated tool facts or application wording.
- Preserve normal W05 fake-provider behavior (at least two model steps and one allowed tool), canonical game-state invariance, and existing game controls.
- Record the same frozen T03/T13/T09/T10 BEFORE and AFTER fixtures/results in `docs/week8/EVIDENCE_W08.md`; keep unrun checks `NOT RUN`.
- Follow task ordering and gates in `specs/004-secure-agent-boundaries/tasks.md`. Pause after the selected priority slice; do not silently perform final assignment closeout.

## Verification instructions

For each iteration run its focused test(s), then `npm run typecheck`, `npm test`, and `npm run build`; run `npm run security:scan` before any push. Run `npm run test:security` only after T047 creates it. Record command, exit code, actual counts and limitations. Browser-specific claims require actual browser/production-preview evidence. Do not run or report a live provider call.
