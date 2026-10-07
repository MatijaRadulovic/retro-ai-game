<!--
Sync Impact Report
- Version change: 1.2.0 → 1.3.0
- Amended principle V and AI scope references for the user-approved, read-only Week 5 "AI Plan to Next Life" flow alongside the paused-shop advisor.
- Added the application-authority rule: model outputs are proposals; only backend validation/policy authorizes tools, continuation, final selection, and termination.
- Impacted sources: AGENTS.md, docs/instructions/03-ai-hint-and-security.md, docs/INSTRUCTIONS.md, specs/003-ai-plan-to-next-life/*, W05 tracking guidance and evidence.
- Follow-up TODOs: implement only from the accepted feature 003 spec and plan; keep both AI flows read-only and preserve advisor contract.
-->
# RETRO SNAKE Constitution

## Core Principles

### I. Server-Authoritative State
The TypeScript Node backend MUST own game containers, configuration, transitions, tick timers,
pause state, purchases, effects, and snapshots. Browser code MUST submit player intent and render
validated snapshots; it MUST NOT advance or mutate authoritative game state. Game transitions
SHOULD remain pure TypeScript with explicit, injectable randomness so rules are deterministic and
independently testable. This prevents client/server state divergence and makes every game rule
reproducible.

### II. Validate Every Trust Boundary
Runtime configuration, HTTP bodies, action values, WebSocket snapshots, model output, and tool
proposals MUST be treated as untrusted. Each boundary MUST use runtime validation, reject unknown
or malformed fields, and preserve state on failure. Where the product contract defines a fallback,
the fallback MUST be explicit and visible; otherwise the operation MUST return a typed safe error.
TypeScript assertions alone do not satisfy this principle.

### III. Small, Original, and Scoped
RETRO SNAKE MUST remain an original 20 × 20 single-player Snake game built with the existing Vite
browser client and TypeScript Node backend. Changes MUST use the current stack and nearby patterns
unless the accepted specification proves a dependency or structural change is necessary. Accounts,
databases, multiplayer play, third-party assets, unrelated frameworks, and broad refactors remain
out of scope unless the project contract is explicitly amended. Every plan MUST identify its
out-of-scope work and prefer the smallest complete design.

### IV. Verification and Evidence
Behavior changes MUST have focused automated coverage for success, boundary, invalid/failure, and
regression cases appropriate to their risk. Tests MUST NOT be weakened or deleted to obtain a pass.
Before implementation, the feature MUST have testable requirements, frozen acceptance scenarios,
and planned verification. After implementation, actual command results and manual-check status MUST
be recorded honestly; skipped or unavailable checks MUST include a reason. Completion claims require
traceable evidence rather than unchecked plan items.

### V. Narrow Read-Only AI Boundary
The only active AI features are the paused-shop advisor governed by
`specs/002-shop-advisor/` and the separately approved "AI Plan to Next Life" flow governed by
`specs/003-ai-plan-to-next-life/`. Both MUST remain read-only, allowlisted, sanitized, and unable to
mutate game state. The approved three-model Google chain remains server-selected under the shop
advisor's V2 policy; the W05 flow additionally applies its stricter run-wide limits. Model output is
always an untrusted proposal. The backend MUST validate message shape and semantics, authorize every
tool against the current phase, arguments, game revision, repetition state, and remaining budget,
validate tool results before reuse, and independently choose the final recommendation and stop
reason. A model MUST NOT authorize its own action, add tools, widen context, set limits, choose the
application's final outcome, or continue after the application stops the run. No browser-held
credential, arbitrary model ID/provider, write-capable tool, open-ended loop, or game-state mutation
may be introduced. Invalid inputs, proposals, results and finals MUST fail safely without exposing
private data; terminal failures MUST NOT trigger another provider attempt.

## Product and Technology Constraints

- The board defaults and core rules in `docs/specs/BASE_GAME_SPEC.md` remain authoritative unless a
  current accepted feature specification explicitly amends them.
- One server MAY host multiple independent in-memory game containers; each container has exactly
  one player until a separate multiplayer feature is approved.
- The existing TypeScript, Node.js, Vite, DOM/CSS, HTTP, and WebSocket architecture MUST be retained.
- Persistent progression, accounts, online currency, deployment, AI/provider changes beyond the
  explicitly approved shop-advisor scope, music, logos, and third-party visual assets are prohibited unless
  the project contract is amended.
- Secrets, credentials, private data, and unrelated local files MUST NOT enter prompts, logs,
  snapshots, source, or committed artifacts.

## Specification-Driven Workflow

1. A substantive feature MUST begin with an accepted specification containing scope, assumptions,
   testable requirements, user scenarios, success criteria, and explicit exclusions.
2. Planning MUST document technical context, constitution compliance, resolved research decisions,
   state/data models, interface contracts, runnable validation scenarios, and dependency-ordered
   tasks before implementation begins.
3. The task evidence record MUST preserve the baseline, frozen evals, controlled iterations, actual
   verification output, and known limitations. The work log and AI usage log MUST link rather than
   duplicate that evidence.
4. Implementation MUST stay within the accepted plan or stop for a specification amendment when a
   material scope or behavior decision changes.
5. Required implementation gates are `npm run typecheck`, `npm test`, `npm run build`, and
   `git diff --check`, plus the feature's focused manual scenarios. Documentation-only changes MUST
   run applicable document checks and record why code checks were skipped.

## Governance

This constitution is the highest Spec Kit planning authority for this repository. Current user
requirements and `AGENTS.md` remain higher project authorities; `docs/INSTRUCTIONS.md` routes work to
the governing product specs and focused instruction modules. Any artifact that conflicts with a MUST
in this constitution MUST be revised before implementation.

Amendments require an explicit rationale, an updated Sync Impact Report, semantic versioning, and a
review of affected specs, plans, templates, and task evidence. A MAJOR version removes or redefines a
principle incompatibly, a MINOR version adds or materially expands governance, and a PATCH version
clarifies wording without changing obligations. Feature planning and final handoff MUST include a
constitution compliance review; unjustified complexity or exceptions block completion.

**Version**: 1.3.0 | **Ratified**: 2026-09-29 | **Last Amended**: 2026-10-07
