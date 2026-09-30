# Build the Gemini Shop Advisor

**Version:** v2

## Goal

Replace the browser movement-Hint mock with read-only advice in the paused perk shop. The player asks whether to buy Extra XP, Luck, +1 Life, or wait. Implement the approved three-model Google flow and validated structured response in [feature 002](../../../specs/002-shop-advisor/spec.md).

## Context and source priority

Follow the current user request, [project instructions](../../../AGENTS.md), [shop advisor specification](../../../specs/002-shop-advisor/spec.md), [plan](../../../specs/002-shop-advisor/plan.md), [contract](../../../specs/002-shop-advisor/contracts/shop-advice-api.md), [AI security rules](../../instructions/03-ai-hint-and-security.md), and implemented game rules, in that order. The [v1 Gemini prompt](BUILD_PROMPT_GEMINI_HINT_V1.md) and Week 3 movement-Hint prompt are historical. Integrate the user's system prompt only after checking its facts against current perk rules.

## Scope and constraints

- Keep the game and purchases server-authoritative. Advice is read-only; no model output can buy a perk or change a run.
- Use only the server-owned allowlist Gemini 3.8 Flash, Gemini 3.5 Flash-Lite, then Gemma 4. Never put `GEMINI_API_KEY` in browser code, Vite configuration, public data, logs, tests, evidence, or prompts. Never read secret-file contents.
- Request only the sanitized shop context. Require structured `decision` and `reasonCode`; validate exact shape and current legal meaning before display.
- Allow one Gemini 3.8 Flash attempt, then at most two Gemini 3.5 Flash-Lite attempts, then at most three Gemma 4 attempts, with 10 seconds per call and one bounded overall deadline. Use stepped backoff delays of 1, 3, 5, 5, then 5 seconds. After two transient Flash failures across requests, mark Flash congested in server memory for 15 minutes; requests during that window start with Flash-Lite. Retry/switch only classified transient or confirmed capability failures; terminal failures produce unavailable with no recommendation.
- Keep the shop and game controls responsive. Discard stale results after shop close, purchase, restart, resume, or revision change.
- Use fake transport for all automatic tests. Do not require a real key or live request.

## Allowed files

Edit the relevant server/client Hint and shop code, focused tests, feature 002 artifacts, `AGENTS.md`, AI security/tool documents, README, and tracking evidence. Keep unrelated powerups mechanics unchanged.

## Acceptance and verification

Complete [feature tasks](../../../specs/002-shop-advisor/tasks.md). Prove exact attempt order and counts, affordability/cap/revision validation, terminal no-retry cases, state invariance, safe public errors, and browser secret non-exposure. Run `npm run typecheck`, `npm test`, `npm run build`, `npm run security:scan`, the configured pre-push guard, and `git diff --check`. Record actual results in [Evidence 009](../../tracking/evidence/EVIDENCE_009.md).
