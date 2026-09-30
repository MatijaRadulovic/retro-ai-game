# Feature Specification: Shop AI Advisor

**Feature Branch**: `main` (feature directory `002-shop-advisor`)
**Created**: 2026-09-30
**Status**: Reliability V2 implementation in progress; see [Gemini Hint Changes V2](../../docs/specs/GEMINI_HINT_CHANGES_V2.md)
**Input**: User request to replace movement Hints with shop purchase advice and subsequent V2 request for sanitized telemetry, distinct structured-output failures, safe `Retry-After`, and a free-tier chain of one Flash attempt, two Flash-Lite attempts, and three Gemma 4 attempts.

## User Scenarios & Testing

### User Story 1 — Ask for shop advice (Priority: P1)

While the shop is open, a player asks whether to buy Extra XP, Luck, or +1 Life, or to save points. The answer reflects the current run and explains the decision without buying anything.

**Why this priority**: This is the feature's direct player benefit.
**Independent Test**: Open a paused shop with known progression and perk values, ask for advice, and verify one legal recommendation appears while points and perks stay unchanged.

**Acceptance Scenarios**:

1. **Given** an open shop with an affordable, uncapped perk, **when** the player asks for advice, **then** the result recommends exactly one available perk or waiting and gives a short reason.
2. **Given** no perk is affordable, **when** the player asks, **then** the result cannot recommend a purchase.
3. **Given** a perk at its cap, **when** the player asks, **then** the result cannot recommend buying that perk.
4. **Given** the player buys a perk, closes the shop, or restarts while advice is pending, **when** the old answer arrives, **then** it is discarded.
5. **Given** the shop is closed, **when** the player tries to ask through the interface, **then** the action is unavailable. A direct request for a game that is not paused is rejected before any model call.

---

### User Story 2 — Get a reliable result or a safe unavailable state (Priority: P2)

The player receives advice within a bounded wait even when the first model is slow, busy, rate limited, or unavailable. A secondary model with broader expected availability can answer after permitted retries. If no valid answer is available, the shop remains usable and clearly says advice is unavailable.

**Why this priority**: A failed external service must not stall the game or make a purchase decision for the player.
**Independent Test**: Simulate primary failure, secondary success, terminal failure, cancellation, and exhausted time with controlled responses.

**Acceptance Scenarios**:

1. **Given** primary success, **when** advice is requested, **then** its validated decision is shown and the secondary is not called.
2. **Given** an eligible primary failure, **when** approved fallbacks are available, **then** Flash-Lite is tried at most twice followed by Gemma 4 at most three times within the same deadline.
3. **Given** two consecutive transient primary failures across advice requests, **when** another request starts during the next 15 minutes, **then** it skips the primary and starts with Flash-Lite.
4. **Given** invalid input, missing configuration, authentication or permission failure, refusal, invalid model output, or cancellation, **when** it occurs, **then** no further model is called and a safe unavailable state is shown.
5. **Given** all permitted attempts fail or the deadline expires, **when** the result returns, **then** it has no purchase recommendation and leaves the game unchanged.

---

### User Story 3 — Trust the advice boundary (Priority: P3)

The application accepts only a small, structured decision and checks it against current shop rules before display. Credentials and unrelated game data remain private.

**Why this priority**: Invalid prices, fabricated perks, or leaked credentials would undermine the feature.
**Independent Test**: Supply malformed, extra-field, unaffordable, capped, stale, and hostile outputs; verify rejection, privacy, and state invariance.

**Acceptance Scenarios**:

1. **Given** an unknown action, extra field, malformed structure, or unsupported reason, **when** output is validated, **then** it cannot be shown as advice.
2. **Given** an unaffordable or capped purchase, **when** output is validated, **then** it is rejected even if structurally valid.
3. **Given** any request or failure, **when** public responses and browser assets are inspected, **then** they contain no credential, raw provider error, private prompt, or unrelated game state.

### Edge Cases

- Extra XP and Luck each cap at level 5 and cost 1–5 points. +1 Life caps at two held charges and costs 5 then 8 points.
- Lucky pickups can grant bonus perk points without a level increase; use the actual unspent balance.
- The shop can remain open with zero points, with all perks capped, or after an advice failure.
- Concurrent asks must not create unbounded model calls.
- A secondary model may also be unavailable; its expected greater capacity is not a guarantee.
- The player may close the shop or disconnect while a request is in flight.
- The congestion marker is held only in server memory and resets when the server process restarts.

## Requirements

### Functional Requirements

- **FR-001**: The interface MUST offer advice only while the shop is open. The server MUST accept advice requests only while the authoritative game is paused.
- **FR-002**: Advice MUST use authoritative score, XP, level, unspent points, owned perks, next prices, and actual perk effects. It MUST exclude unrelated and private data.
- **FR-003**: Successful advice MUST return exactly one decision: buy Extra XP, buy Luck, buy +1 Life, or wait, with a bounded explanation category displayed safely by the application.
- **FR-004**: Every decision MUST be checked against the current balance, caps, prices, game status, and run revision before display. Invalid or stale advice MUST not appear as current.
- **FR-005**: Advice MUST be read-only and MUST never buy, move, pause, restart, or otherwise change the game.
- **FR-006**: The system MUST use the server-owned allowlist `gemini-3.8-flash`, `gemini-3.5-flash-lite`, then `gemma-4-26b-a4b-it`. Request input MUST not be able to specify arbitrary model IDs.
- **FR-007**: Attempts MUST be asynchronous and governed by one 85-second deadline. Each call MUST time out after at most 10 seconds. A normal request MUST allow one Flash call, at most two Flash-Lite calls, and at most three Gemma calls. Base delays after successive transient failures MUST be 1, 3, 5, 5, then 5 seconds with bounded jitter. Only transient or confirmed model-capability failures may switch models; terminal failures MUST stop.
- **FR-012**: Two consecutive transient primary failures across logical requests MUST mark the primary congested in server memory for 15 minutes. Requests during that window MUST skip the primary. The marker MUST expire automatically and MUST NOT be exposed in public responses.
- **FR-013**: Every provider attempt MUST emit privacy-safe structured telemetry with model, adapter, ordered attempt, phase, outcome/error class, latency, fallback/congestion state, and available normalized usage. It MUST exclude credentials, raw payloads, game/session identifiers, and private shop values.
- **FR-014**: Empty output, invalid JSON, schema-invalid JSON, and schema-valid but semantically invalid advice MUST be classified separately internally, tested separately, stop fallback, and map to the same safe public unavailable result.
- **FR-015**: A valid `Retry-After` within the local wait budget MUST be honored. If it exceeds that budget or the remaining deadline, the system MUST skip remaining attempts for that model rather than retrying it early.
- **FR-008**: Exhaustion, cancellation, and invalid output MUST produce a clear unavailable state with no purchase recommendation. Controls and shopping MUST remain usable.
- **FR-009**: Credentials, raw provider content, and private instructions MUST stay on the server and out of public responses and browser assets.
- **FR-010**: The server-owned instruction MUST accurately describe current game and perk rules and include the user's supplied shop-advice prompt once received. It MUST not grant authority to change game rules or output validation.
- **FR-011**: A player MUST be able to request fresh advice after a shop change, with earlier advice cleared or marked stale.

### Key Entities

- **Shop advice context**: Minimum authoritative run progression and perk values needed for a recommendation, tied to a game revision.
- **Advice decision**: One of three purchases or waiting, with a bounded reason category.
- **Advice result**: Validated advice and its model source, or an unavailable result without a decision.
- **Model attempt**: One timed request to an approved model, classified as success, transient failure, or terminal failure.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In controlled cases, 100% of shown purchase recommendations are affordable, uncapped, and current at display time.
- **SC-002**: Every request ends with validated advice or an unavailable state within 85 seconds; game controls never wait for a model.
- **SC-003**: In eligible failure cases, Flash is attempted at most once, Flash-Lite at most twice, and Gemma at most three times; terminal failures make no extra attempt.
- **SC-006**: After two controlled transient primary failures, the next request within 15 minutes makes zero primary calls; a request after expiry can use the primary again.
- **SC-004**: All controlled malformed, stale, or semantically invalid responses are rejected without changing game state.
- **SC-005**: Public responses and browser assets contain zero credentials or raw provider payloads.

## Assumptions and dependencies

- Model selection is automatic and server-side; the browser cannot choose the provider model.
- The free-tier chain is Gemini 3.8 Flash, Gemini 3.5 Flash-Lite, then Gemma 4 26B A4B IT. Google says actual rate limits vary by project; no fixed quota is assumed.
- The user-approved system prompt is active; its game facts were reconciled with the implemented rules before use.
- The existing shop and run progression are the only advice context. No account, persistence, multiplayer behavior, or automatic purchase is added.
