# Implementation Plan: Shop AI Advisor

> Reliability V2 supersedes the model/retry details in this original implementation plan. Current tasks and policy live in [Gemini Hint Changes V2](../../docs/specs/GEMINI_HINT_CHANGES_V2.md); this file remains the design record for the initial feature.

**Branch**: `main` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)
**Input**: [Shop AI Advisor specification](spec.md), current user request, [research](research.md), existing [Gemini plan](../../docs/specs/GEMINI_HINT_INTEGRATION.md), and [project constitution](../../.specify/memory/constitution.md).

## Summary

Replace the browser movement Hint with read-only shop advice. The server derives a minimal context from an authoritative paused session, calls the allowlisted Gemini 3.8 Flash, Gemini 3.5 Flash-Lite, and Gemma 4 models when eligible, validates a two-field structured choice, and returns either legal advice or an explicit unavailable result. Two transient Flash failures open a 15-minute in-memory congestion window so later requests start with Flash-Lite. The browser offers the action inside the shop and discards stale replies.

## Technical Context

**Language/Version**: TypeScript on Node.js 22+, browser TypeScript through Vite 6
**Primary Dependencies**: Existing `ws`, `tsx`, and native Node `fetch`; no new runtime package
**Storage**: Existing in-memory game sessions only; no advice persistence
**Testing**: Node test runner with fake injected provider transport, no live key/network
**Target Platform**: Local TypeScript Node backend and Vite browser client
**Project Type**: Single repository browser game with HTTP/WebSocket backend
**Performance Goals**: Advice settles within 85 seconds; gameplay loop and controls never wait on the provider
**Constraints**: Server-only `GEMINI_API_KEY`, strict schema and semantic checks, at most six calls, no state mutation
**Scale/Scope**: One in-flight advice request per game session; existing independent single-player sessions

## Constitution Check

| Principle | Design response | Gate |
|---|---|---|
| Server-Authoritative State | Context comes from `GameSessionManager.get`; purchases remain on existing server route | Pass |
| Validate Every Trust Boundary | Empty request body, provider JSON, decision legality, public response, and browser result are checked | Pass |
| Small, Original, and Scoped | Native fetch and one new shop advice route; no database, new provider, or economy change | Pass |
| Verification and Evidence | Frozen cases in Evidence 009; focused fake transport/API tests and required checks | Pass |
| Narrow Read-Only AI Boundary | User request explicitly changes the Hint to shop advice; no tool writes or model-controlled game action | Pass after updating constitution references |

The current constitution and permanent AI instructions name the old movement-Hint tool. The user's current request authorizes replacing that flow. Update those documents to the revised read-only shop boundary before code completion.

## Phase 0: Research

See [research.md](research.md). Model IDs, free-tier support, REST schema fields, local validation, quota caveat, and bounded failure policy are resolved. The [user-approved system prompt](../../docs/prompts/week4/SHOP_ADVISOR_SYSTEM_PROMPT_V1.md) is reconciled with the implemented perk rules.

## Phase 1: Design

### Context and trust boundaries

1. Browser sends `POST /api/games/:id/shop-advice` with `{}` while its shop is visible and the last snapshot says paused. It sends no game data, key, prompt, or model name.
2. Server validates body, paused status, and one in-flight request per game. It derives a `ShopAdviceContext` with revision, score, XP, level, points, perk levels/charges, next costs, and known effects.
3. Server uses an allowlisted three-model chain. The static system instruction contains checked game rules plus the user's supplied shop-advice instruction. User content is the serialized context only. Neither raw provider body nor key is logged.
4. Provider adapter uses direct REST and a passed `AbortSignal`. On retryable failure it applies the [research policy](research.md) under one deadline. Terminal failure or exhausted attempts yields unavailable.
5. Server validates exact model output fields, decision/reason pairing, and affordability/cap. It re-reads the session revision/status before returning advice. Display text is generated locally from reason codes.
6. Browser validates the public result and checks that its current game revision and shop visibility still match. It renders source and text using `textContent`, or a stable unavailable message. Purchase controls remain manual.

### Reliability details

- Overall deadline: 85 seconds including waits, network, and parse.
- Per call: at most 10 seconds and no more than remaining overall time.
- Attempt order: Flash once, Flash-Lite up to twice, then Gemma up to three times for eligible failures.
- Transient: network/timeout, HTTP 408/429/500/502/503/504. Terminal: configuration, 400/401/403/404, refusal, cancellation, malformed/empty/semantically invalid output.
- Backoff: 1, 3, 5, then 5 seconds after successive transient failures, clipped to the remaining deadline. Honor `Retry-After` up to the 5-second delay cap.
- Congestion memory: two transient primary failures open a server-memory marker for 15 minutes. While open, new logical requests skip both primary attempts and receive up to three secondary attempts. The marker is process-local and expires automatically.
- Abort on browser disconnect or client cancellation, propagate to `fetch`, clear timers and in-flight marker in `finally`.
- Public response: no raw upstream error, prompt, key, stack, or internal transport data.

### Prompt dependency

Store the approved text as a server-side source artifact and reconcile every fact about XP, Lucky pickups, perk prices/caps/effects with `src/game/snakeEngine.ts` and the accepted powerups spec. The system instruction requests only the structured output contract; any instruction to buy automatically or change rules is rejected by application validation.

### Documentation and governance

Update `docs/specs/GEMINI_HINT_INTEGRATION.md`, `docs/specs/TOOL_CONTRACT.md`, `docs/instructions/03-ai-hint-and-security.md`, `AGENTS.md`, and `.specify/memory/constitution.md` to the new shop-only, three-model scope. Keep the old v1 build prompt as historical; write a v2 prompt for this implementation. Update README and tracking records.

## Project Structure

### Feature documentation

```text
specs/002-shop-advisor/
  spec.md
  plan.md
  research.md
  data-model.md
  contracts/shop-advice-api.md
  quickstart.md
  tasks.md
  checklists/requirements.md
```

### Source and tests

```text
server/ai/shopAdvice.ts        # context, validation, orchestration
server/ai/geminiTransport.ts   # Gemini REST transport
server/ai/shopPrompt.ts        # reviewed static system instruction
server/gameSession.ts          # read-only shop context access
server/httpServer.ts           # advice route and cancellation
server/index.ts                # server runtime key injection
src/ai/shopAdvice.ts           # public result validation and display mapping
src/api/gameClient.ts          # advice request
src/main.ts                    # shop button and pending/stale UI
index.html, src/styles.css     # shop advice presentation
tests/shopAdvice.test.ts       # pure validation and retry policy
tests/httpServer.test.ts       # endpoint boundary and state invariance
```

**Structure Decision**: Extend the existing server, client, and test folders. Retire the browser mock movement Hint from the active UI; maintain or replace its old tests with focused coverage of the new contract.

## Complexity Tracking

No constitution exception is needed after the authorized AI-boundary update. The three Google models are fixed allowlisted branches within the same provider, not a generic model router.

## Post-design Constitution Check

All five principles remain satisfied after the contract and instruction updates above. The remaining external dependencies are the user's Gemini project quota and live provider availability; neither is asserted by the offline test plan.
