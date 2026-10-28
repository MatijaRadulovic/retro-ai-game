# Feature Specification: Secure Agent Boundaries

**Feature Branch**: `main` (planning only; no branch change requested)

**Created**: 2026-10-28

**Status**: Draft for review

**Input**: User description: protect the no-login game session and per-session data, prevent direct request and model abuse, enforce per-session and global limits, strengthen JSON/tool/model validation and prompt-injection resistance, add safe security logs, and preserve the existing read-only W05 flow.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Play and analyze only my session (Priority: P1)

A player can create and use a temporary no-login game session, while another browser session cannot read, change, subscribe to, or request AI analysis for that player's games. Resource identifiers alone never grant access.

**Why this priority**: Without this boundary, knowing a game identifier is sufficient to access state, mutate play, receive snapshots, and spend the shared provider budget.

**Independent Test**: Create synthetic session scopes A and B and one game for each. Verify that A can complete normal game and Shop Strategist actions on A, while every API, event-stream, and agent attempt against B is denied before provider or tool work.

**Acceptance Scenarios**:

1. **Given** sessions A and B each own one game, **when** A requests A's snapshot, action, event stream, or Shop Strategist run, **then** the authorized operation follows its normal rules.
2. **Given** sessions A and B each own one game, **when** A requests any B resource, **then** no B data is returned, no B state changes, and no provider or business tool starts.
3. **Given** a direct or cross-origin request knows a game identifier but lacks the valid server-issued session and request context, **when** it calls a protected operation, **then** it is denied before protected work begins.
4. **Given** a player changes local browser score or state, **when** the player requests agent analysis, **then** authorization, limits, model context, and canonical score still come only from the server.

---

### User Story 2 - Keep shared AI resources available (Priority: P2)

A legitimate player can use the Shop Strategist within documented limits, while repeated, parallel, or newly-created-session requests cannot exceed per-session and process-wide resource budgets.

**Why this priority**: Per-run budgets already exist, but they do not prevent many simultaneous runs or unbounded in-memory sessions from exhausting provider quota, memory, or event-loop capacity.

**Independent Test**: With a fake clock and delayed fake provider, submit allowed and excess requests across multiple games and scopes. Measure active runs and provider attempts, verify early rejection, release capacity, and confirm a later legitimate run succeeds.

**Acceptance Scenarios**:

1. **Given** a session inside its acceptance window and available global capacity, **when** it starts a valid run, **then** the run can complete through at least two model steps and one permitted tool execution.
2. **Given** the documented per-session rate is exhausted, **when** the same session uses another game identifier, **then** the excess request is denied before a provider attempt and the limit is not reset.
3. **Given** the maximum number of process-wide active runs, **when** another valid session starts a run, **then** the new run is denied before provider work and the measured active count never exceeds the maximum.
4. **Given** a run completes, is cancelled, or reaches its deadline, **when** a later request is admitted, **then** capacity has been released exactly once and the later legitimate request can proceed.
5. **Given** repeated game/session creation and event subscriptions, **when** configured process limits are reached, **then** excess resources are refused or expired without affecting active legitimate play.

---

### User Story 3 - Receive safe, grounded, auditable advice (Priority: P3)

A player receives only a validated plan and evidence grounded in facts returned by tools during that authorized run. Malicious model proposals, tool data, HTML-like text, log-forging text, and hidden instructions cannot expand authority or become executable content.

**Why this priority**: The current allowlist protects state mutation, but final evidence prose can still claim facts not contained in the cited tool result, and the full model-to-browser security chain lacks W08 browser and security-event proof.

**Independent Test**: Drive the real agent orchestration with a deterministic fake provider that returns invalid envelopes, forbidden and inherited tool names, out-of-scope arguments, malicious tool results, fabricated evidence, prompt-injection responses, and safe normal output. Verify policy decisions, counters, state invariance, sanitized events, and the real browser DOM.

**Acceptance Scenarios**:

1. **Given** a model proposes an unknown, inherited, write-capable, or out-of-scope tool, **when** the application evaluates it, **then** the proposal is rejected, no forbidden operation executes, and canonical state is unchanged.
2. **Given** a permitted tool returns an invalid, oversized, additional, or secret-bearing field, **when** the result is validated, **then** the raw result is not sent to a later model step or shown to the player.
3. **Given** a final response cites a real step but contains a claim not represented by that step's validated result, **when** final validation runs, **then** the claim is rejected or replaced with application-generated wording.
4. **Given** HTML-looking, bidi, control-character, or URL-like content reaches the final display, **when** the browser renders it, **then** it cannot create active content or a misleading executable context, while ordinary Serbian text, apostrophes, and `a < b` remain readable.
5. **Given** an invalid request, denied access, exhausted limit, rejected tool, or completed run, **when** a security event is recorded, **then** it contains only an application-generated correlation value and allowlisted metadata, with no secret, token, raw prompt, raw provider response, private game data, or attacker-controlled log structure.

### Edge Cases

- A session value is missing, malformed, expired, rotated, or presented with another session's request-verification value.
- A resource exists but belongs to another session; the public response must not disclose private contents or unnecessary existence details.
- A session clears browser data or creates more game identifiers during an active rate window; the global backstop remains effective.
- A client disconnects immediately before or after the server attaches its abort listener.
- A provider ignores cancellation and returns after the application deadline; its result must never become success and capacity must not be released in a way that admits unbounded background work.
- Two requests cross a rate-window or capacity boundary at the same instant.
- A tool name or JSON object contains `constructor`, `toString`, `__proto__`, unknown fields, `null`, or the wrong container type.
- A model cites a valid tool step but fabricates its numeric or historical conclusion.
- A security-event input contains newlines, Unicode direction controls, a synthetic secret, or text resembling another JSON event.
- Process restart clears in-memory sessions, windows, history, and logs; the local profile must state this limitation rather than imply durable identity or multi-process enforcement.

## Requirements *(mandatory)*

### Functional Requirements

#### Session and access boundary

- **FR-001**: The system MUST issue an unpredictable temporary session scope on the server; the browser and model MUST NOT choose or modify that scope.
- **FR-002**: Every game MUST belong to exactly one server-recognized session scope for its lifetime.
- **FR-003**: Every protected HTTP operation, event subscription, and agent start MUST verify the request scope and resource ownership before reading private data, mutating state, invoking a provider, or executing a tool.
- **FR-004**: A resource identifier MUST be treated only as an identifier and MUST NOT be sufficient proof of access.
- **FR-005**: Protected browser requests that automatically carry a session credential MUST also pass a request-origin and request-verification check appropriate to the no-login browser session.
- **FR-006**: Missing, malformed, expired, cross-session, and cross-origin contexts MUST fail with a stable public error policy that does not expose private resource contents or internal credentials.
- **FR-007**: The model and tool proposals MUST NOT receive or determine the session credential, resource owner, provider/model selection, request-verification value, or security limits.

#### Input and request admission

- **FR-008**: JSON endpoints MUST limit the request body before full parsing and accept only the documented JSON media type, object shape, field set, field types, enumerations, lengths, counts, and numeric ranges.
- **FR-009**: Unknown privileged fields, including owner, role, model, provider, limits, and step counts, MUST be rejected and MUST NOT alter server policy.
- **FR-010**: An initial request that fails parsing, schema, status, access, origin, verification, rate, or capacity checks MUST produce zero provider attempts and zero business-tool executions.

#### Resource governance

- **FR-011**: The system MUST enforce no more than one active agent run per session scope, no more than two active agent runs process-wide, no more than five newly accepted runs per session scope in any 60-second window, and no more than twenty newly accepted runs process-wide in any 60-second window.
- **FR-012**: Rate windows MUST apply across all games owned by the same session scope, while process-wide limits MUST remain effective when a requester creates a new temporary session.
- **FR-013**: The system MUST enforce no more than three active games per session scope and no more than one hundred in-memory games process-wide, with a documented bounded cleanup or expiry policy for inactive games and subscriptions.
- **FR-014**: Existing per-run limits remain server-owned: at most five model decisions, four tool executions, two evaluator executions, eight total provider attempts, two provider fallbacks, ten seconds per provider call, forty-five seconds total, 4 KiB per tool result, 16 KiB per provider response, and 4,096 characters of extracted model text.
- **FR-015**: Retries and model fallback MUST consume the same run budget; no limit may reset because a step, game, model, or provider attempt changes.
- **FR-016**: Capacity MUST be acquired atomically before provider work and released exactly once only after success, controlled failure, cancellation, or completed cleanup. Late results MUST NOT become success.
- **FR-017**: Limit rejection MUST use a stable reason and the appropriate rate/capacity response, including `429` for an exceeded acceptance rate.

#### Agent, tool, and final-result boundary

- **FR-018**: The allowed model chain MUST remain the approved server-selected Google chain; arbitrary model identifiers and any additional provider remain forbidden.
- **FR-019**: The executable tool registry MUST remain closed to exactly `get_shop_state`, `evaluate_perk_plan`, and `get_recent_runs`; model-defined, inherited, write-capable, network, file, shell, and arbitrary-fetch tools MUST be rejected.
- **FR-020**: A permitted tool name MUST NOT bypass strict argument validation, domain rules, authorized data scope, execution count, repeat detection, or deadline checks.
- **FR-021**: Every tool result MUST pass strict allowed-field, value, size, and scope validation before entering the model transcript. Raw internal objects MUST NOT be forwarded automatically.
- **FR-022**: The read-only agent MUST NOT buy, move, pause, resume, restart, or otherwise change canonical game state; every success and adversarial scenario MUST compare authoritative state before and after.
- **FR-023**: The final result MUST contain only documented variants and bounds. A non-empty plan MUST equal a plan that the application evaluator accepted during the same authorized run.
- **FR-024**: Player-facing factual evidence MUST be selected from structured facts present in the cited validated tool result or generated by the application from those facts; a model-authored sentence with only a valid source and step reference is insufficient.
- **FR-025**: Untrusted text and tool data MUST never alter instructions, allowlists, access scope, budgets, provider selection, or stop decisions, regardless of prompt content.

#### Browser, secrets, and events

- **FR-026**: Untrusted player-facing content MUST be displayed as plain text or rejected; it MUST NOT be interpreted as HTML, Markdown with active content, a script, a command, or an unrestricted URL.
- **FR-027**: The locally served production profile MUST enforce a content security policy that restricts scripts and connections and forbids unnecessary objects, base changes, and framing, plus MIME-sniffing and referrer protections.
- **FR-028**: Provider secrets MUST remain in server runtime configuration and MUST NOT appear in browser artifacts, source maps, public responses, model context, tool data, security events, or submitted evidence.
- **FR-029**: The system MUST emit a small allowlist of structured security events for request admission, access denial, limit denial, tool rejection, provider attempts, and run completion, using application-generated correlation values and enumerated reason codes.
- **FR-030**: Security events MUST NOT contain raw prompts, provider payloads, free-form attacker input, resource/session identifiers, cookies/tokens, complete game state, stack traces, chain-of-thought, or secrets; log-forging characters MUST not create another event.
- **FR-031**: The local single-process profile MUST explicitly document that sessions, rate windows, histories, game state, and operational events are not durable across process restart and do not provide multi-process coordination.

#### Regression and evidence

- **FR-032**: The normal game and W05 Shop Strategist flow MUST remain functional with at least two model decisions, one real allowed tool execution, a valid grounded result, and unchanged canonical game state.
- **FR-033**: Automated security tests MUST use the production validation, authorization, tool dispatch, budget, and rendering paths with deterministic fake providers and synthetic data; they MUST NOT call a live provider.
- **FR-034**: The W08 evidence record MUST map every I1–I8 invariant and T00–T17 scenario, plus the applicable cross-site request scenario, to expected and observed results without converting unexecuted checks into passes.

### Key Entities

- **Session Scope**: A temporary, server-issued security context with lifecycle, rate window, active-run count, and owned games. It is not a real-world user account.
- **Owned Game**: The existing authoritative single-player game plus an internal owner-scope relationship; its public identifier is not an access credential.
- **Request Context**: The server-validated session, request-origin/verifier, correlation value, and authorization decision used before a handler, provider, or tool.
- **Admission Budget**: Per-session and process-wide acceptance windows, active-run capacity, game count, subscription count, and cleanup state.
- **Authorized Agent Run**: The existing bounded W05 run plus its immutable authorized scope and acquired capacity lease.
- **Grounded Evidence**: A structured reference to an allowlisted fact from a validated tool result, rendered through application-owned wording.
- **Security Event**: An allowlisted, single-record observation containing a correlation value, event kind, outcome, reason code, and safe counters only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In all A/B access tests, 100% of A-to-B HTTP, event-stream, and agent requests are denied before provider or tool work, while 100% of equivalent A-to-A positive controls succeed under their normal state rules.
- **SC-002**: Across concurrent test requests, measured active agent work never exceeds two process-wide or one per session, and every excess request records zero provider attempts and zero tool executions.
- **SC-003**: In a 60-second controlled window, the first five eligible runs for one session may be admitted and every later one is denied; creating another game does not change that result, and a process-wide backstop remains effective across new temporary sessions.
- **SC-004**: Every tested completion, cancellation, and deadline releases capacity exactly once, and the next eligible request succeeds without exceeding the active maximum.
- **SC-005**: 100% of forbidden, inherited, malformed, out-of-scope, repeated, oversized, secret-bearing, and injection-driven model/tool proposals produce no forbidden tool execution and no canonical state change.
- **SC-006**: 100% of accepted final evidence items correspond to a structured fact present in the cited tool result; fabricated claims are rejected or replaced with application-generated text.
- **SC-007**: Browser tests show no executable or dangerous DOM for every XSS/HTML/URL marker, while all positive plain-text fixtures render correctly under the active production security policy.
- **SC-008**: The synthetic server secret appears zero times in client artifacts, public responses, model context, tool transcript, and captured operational events.
- **SC-009**: Every W08 negative scenario emits at most the documented minimal security event set, and newline/log-forging fixtures produce exactly one parseable event per intended record.
- **SC-010**: The same deterministic normal W05 scenario succeeds before and after hardening with at least two model steps and one allowed tool call, and its authoritative game snapshot is unchanged.

## Assumptions

- This is a local, single-process, single-player demonstration without accounts; a temporary session scope limits access but does not establish a durable human identity.
- The global process-wide limits are mandatory because a no-login requester can clear browser state or create a new temporary session.
- Existing in-memory game state and run history remain in memory only. A database, durable login, distributed rate limiter, and multi-process deployment are outside this feature.
- The existing Vite browser client, TypeScript Node backend, WebSocket snapshots, and deterministic fake-provider test approach remain in place.
- The existing W05 tool set and approved Google model chain remain unchanged.
- A dependency upgrade may be performed only if its actual advisory exposure and compatibility are reviewed and all regression gates pass; forced broad upgrades are outside scope.

## Out of Scope

- Accounts, passwords, OAuth, durable identity, recovery, roles, public deployment, or multiplayer.
- Database-backed sessions, persistent logs, distributed locks/rate limits, or cross-process coordination.
- A new provider, arbitrary model selection, RAG, free-text goals, web/file/shell tools, or write-capable AI actions.
- A leaderboard, verified anti-cheat system, or treating browser/localStorage score as authoritative.
- Broad framework changes, unrelated refactors, third-party assets, or a rich-text/Markdown renderer.
