# Build Prompt — Gemini Hint Changes V2

**Version:** v2

## Goal

Implement the accepted reliability revision in [Gemini Hint Changes V2](../../specs/GEMINI_HINT_CHANGES_V2.md): sanitized attempt telemetry, distinct structured-output failures, safe `Retry-After`, and a provider-specific Gemma 4 final fallback.

## Context and source priority

Use the current user request first, then `AGENTS.md`, project instructions 02–05, the linked V2 plan, feature 002, the shop contract, approved shop system prompt, current server code/tests, and official Google Gemini/Gemma documentation. Treat the downloaded Week 4 addendum as generic guidance adopted only where the user explicitly requested it. Never read secret-file contents.

## Scope and constraints

- Preserve the read-only server authority and exact public shop-advice response.
- Use only the three allowlisted server-owned models and the attempt counts in the V2 plan.
- Keep all tests offline and inject fake provider behavior, time, jitter, waiting, and telemetry where needed.
- Log only sanitized structured metadata. Never log raw prompts, responses, keys, game IDs, session IDs, or private game statistics.
- Do not add dependencies or change game rules, purchases, UI flow, deployment, accounts, or multiplayer behavior.

## Allowed files

Edit the narrow AI server/client model contract, server bootstrap, focused tests, the V2 plan, owning shop-advisor documentation, and required evidence/work/AI-usage records.

## Acceptance criteria

Complete every checkbox in the [V2 plan](../../specs/GEMINI_HINT_CHANGES_V2.md). Prove exact 1/2/3 routing, separate Gemma request construction, safe terminal/transient/capability handling, `Retry-After` behavior, one privacy-safe event per attempt, optional token usage, and the four required structured-output failure cases.

## Verification instructions

Run `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan`, `git diff --check`, and the configured pre-push guard. Record real results in Evidence 010. Do not make a live provider call unless the user separately opts in.
