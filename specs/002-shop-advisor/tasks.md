# Tasks: Shop AI Advisor

> This checklist records the completed initial implementation. The user requested that the reliability V2 tasks live directly in [Gemini Hint Changes V2](../../docs/specs/GEMINI_HINT_CHANGES_V2.md), without a new Spec Kit task set.

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [HTTP contract](contracts/shop-advice-api.md)

**Tests**: Required by the feature specification and the project constitution; use fake transport only.

## Phase 1: Setup

- [x] T001 Replace the old movement-Hint scope with shop-only advice and two allowlisted Gemini models in `AGENTS.md`, `docs/instructions/03-ai-hint-and-security.md`, `docs/specs/GEMINI_HINT_INTEGRATION.md`, `docs/specs/TOOL_CONTRACT.md`, and `.specify/memory/constitution.md`.
- [x] T002 Create the revised v2 build prompt in `docs/prompts/week4/BUILD_PROMPT_GEMINI_HINT_V2.md` and preserve v1 as historical.

## Phase 2: Foundational

- [x] T003 Define exact-key public advice types, enums, and runtime response validation in `src/ai/shopAdvice.ts`.
- [x] T004 Derive and validate a read-only `ShopAdviceContext` from authoritative session state in `server/ai/shopAdvice.ts`; require paused status, actual points, current next costs, and revision.
- [x] T005 Add frozen contract fixtures for legal, unaffordable, capped, and malformed model decisions in `tests/shopAdvice.test.ts` before implementing decision validation.
- [x] T006 Implement model decision pairing, legality checks, and server-generated messages in `server/ai/shopAdvice.ts`.

## Phase 3: User Story 1 — Ask for shop advice (P1)

**Goal**: The paused shop shows one legal buy/wait recommendation from a fake model without changing game state.
**Independent Test**: `tests/shopAdvice.test.ts` and an HTTP fixture in `tests/httpServer.test.ts` verify legal advice and unchanged revision.

- [x] T007 [US1] Add a paused-only, exact-body `POST /api/games/:id/shop-advice` route with injectable advisor and safe responses in `server/httpServer.ts`.
- [x] T008 [US1] Add an abortable client advice request and strict public-response validation in `src/api/gameClient.ts` and `src/ai/shopAdvice.ts`.
- [x] T009 [US1] Place ASK SHOP AI and its result inside the paused shop, clear stale responses, and keep purchase buttons manual in `index.html`, `src/main.ts`, and `src/styles.css`.
- [x] T010 [US1] Extend `tests/httpServer.test.ts` for paused success, invalid body, wrong status, missing session, and no game revision change.

## Phase 4: User Story 2 — Bounded retry and model fallback (P2)

**Goal**: Gemini 3.8 Flash is tried at most twice; eligible transient failures then use Gemini 3.5 Flash-Lite at most three times under one deadline. Two transient Flash failures open a 15-minute in-memory congestion window.
**Independent Test**: Fake transport cases assert exact order/count, 10-second call timeout, 1/3/5/5-second delays, congestion skip/expiry, cancellation, 429 `Retry-After`, and terminal no-retry behavior.

- [x] T011 [US2] Implement native REST transport with server-only `GEMINI_API_KEY`, minimal JSON context, and structured-output schema in `server/ai/geminiTransport.ts` and `server/index.ts`; put the reviewed user system prompt and accurate game facts in `server/ai/shopPrompt.ts`.
- [x] T012 [US2] Add fake transport tests for primary success, two primary calls, three fallback calls, congestion skip/expiry, exhausted failures, 429 budget, terminal errors, cancellation, and deadline in `tests/shopAdvice.test.ts`.
- [x] T013 [US2] Implement the 85-second logical deadline (V2), max 10-second calls, at most one Flash, two Flash-Lite, and three Gemma calls, 1/3/5/5/5-second bounded-jitter backoff, 15-minute primary congestion memory, and safe unavailable result in `server/ai/shopAdvice.ts`.
- [x] T014 [US2] Abort provider work on dropped HTTP response and prevent overlapping calls per game in `server/httpServer.ts`; test this in `tests/httpServer.test.ts`.

## Phase 5: User Story 3 — Validate and protect the boundary (P3)

**Goal**: Structured output, public data, and browser display cannot turn invalid or stale model content into advice.
**Independent Test**: Fake malformed/stale responses are rejected and scanner finds no key references in browser assets.

- [x] T015 [US3] Validate provider candidate shape, refusal/empty output, exact keys, reason pairing, affordability/caps, and post-call revision in `server/ai/geminiTransport.ts` and `server/ai/shopAdvice.ts`.
- [x] T016 [US3] Add tests for malformed/hostile/illegal/stale output, state invariance, and exact public response shape in `tests/shopAdvice.test.ts` and `tests/httpServer.test.ts`.
- [x] T017 [US3] Remove the active browser mock movement-Hint path and replace or retire its obsolete fixtures without weakening coverage in `src/main.ts`, `src/ai/hint.ts`, and `tests/hint.test.ts`.

## Phase 6: Polish and verification

- [x] T018 Update the player instructions and documentation map for shop advice in `README.md`, `docs/INSTRUCTIONS.md`, and `docs/tracking/CONTEXT_MANIFEST.md`.
- [x] T019 Run `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan`, the configured pre-push guard, and `git diff --check`; record exact outcomes and limitations in `docs/tracking/evidence/EVIDENCE_009.md`.
- [x] T020 Update the handoff and AI contribution record in `docs/tracking/WORK_LOG.md` and `docs/tracking/AI_USAGE_LOG.md`; confirm all tasks are checked in `specs/002-shop-advisor/tasks.md`.

## Dependencies and delivery order

Complete Setup and Foundational before US1. US1 can be tested with an injected fake advisor before live transport exists. Complete US2 before US3 final boundary checks. T019–T020 follow all implementation tasks. No runtime credential or live provider request is required for offline completion.
