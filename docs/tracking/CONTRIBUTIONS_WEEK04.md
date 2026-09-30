# Week 4 Contribution Record — Tim 1 (Retro Snake)

Purpose: the public Git history for Week 04 shows commits only under Matija Radulović's authorship, because Matija committed the shared work from his repository. This record maps each Week 04 area to the people involved and to the files and tests that carry it, so the split can be checked against the code. It states attribution as reported by the team; it does not rewrite Git history.

**Sources:** the two Week 04 weekly reports (`Uros_Milutinovic_Weekly_Report_Week04.pdf`, `Matija_Radulovic_Weekly_Report_Week04.pdf`), [WORK_LOG](WORK_LOG.md), [AI_USAGE_LOG](AI_USAGE_LOG.md), and Evidence [005–012](evidence/).

## Attribution key

- **Uroš (authored locally, committed by Matija):** Uroš developed the work in his local copy and Matija carried it over and committed it. Uroš has no Week 04 commits of his own.
- **Matija:** authored and committed by Matija.
- **Shared:** both members contributed (ideas, review, testing).

## Contribution map

| Area | Who | Where to verify (files / tests / evidence) |
|---|---|---|
| Server-authoritative refactor (backend owns game state, browser renders and sends requests) | Matija | `server/gameSession.ts`, `server/httpServer.ts`, `tests/gameSession.test.ts`, `tests/httpServer.test.ts`, `tests/gameProtocol.test.ts`, [Evidence 005](evidence/EVIDENCE_005.md) |
| XP, perks (Extra XP, +1 Life, Luck), Lucky pickup, shop UI and HUD | Matija | `specs/001-powerups-perks/`, `src/main.ts`, `src/styles.css`, [Evidence 006](evidence/EVIDENCE_006.md), [007](evidence/EVIDENCE_007.md) |
| ASK SHOP AI: read-only advisor in the paused shop (AI never changes game state) | Uroš (authored locally, committed by Matija) | `server/ai/shopAdvice.ts`, `server/ai/shopPrompt.ts`, `specs/002-shop-advisor/`, `docs/specs/GEMINI_HINT_CHANGES_V2.md` |
| Fallback chain Flash ×1 → Flash-Lite ×2 → Gemma ×3, 85 s deadline, `Retry-After`, 15-minute congestion marker | Uroš (authored locally, committed by Matija) | `server/ai/shopAdvice.ts`, `tests/shopAdvice.test.ts`, `specs/002-shop-advisor/research.md` (Reliability V2), [Evidence 009](evidence/EVIDENCE_009.md), [010](evidence/EVIDENCE_010.md) |
| Terminal-error rule (400/401/403/409, refusal, invalid output do not trigger fallback) and safe unavailable result | Uroš (authored locally, committed by Matija) | `server/ai/shopAdvice.ts`, `tests/shopAdvice.test.ts`, `specs/002-shop-advisor/contracts/shop-advice-api.md` |
| Response validation and privacy-safe telemetry | Uroš (authored locally, committed by Matija) | `server/ai/shopAdvice.ts`, `server/ai/geminiTransport.ts`, `tests/shopAdvice.test.ts` |
| Documentation reorganization, specs, tracking records | Uroš (authored locally, committed by Matija) | `docs/`, `specs/002-shop-advisor/`, `docs/tracking/` |
| Choosing the agents, defining what to build | Shared (Uroš chose agents and gave ideas) | [AI_USAGE_LOG](AI_USAGE_LOG.md) |
| Review, running tests and the app, manual play-testing; Week 4 review fixes and browser E2E (`scripts/e2e/`) | Shared (review fixes committed by Uroš) | [Evidence 011](evidence/EVIDENCE_011.md), [012](evidence/EVIDENCE_012.md), [EVIDENCE_013](evidence/EVIDENCE_013.md) |

## Prior work by Uroš with public authorship (Week 3)

Snake engine, configuration validation, the first local AI Hint, and the CRT/particle/shake polish were authored by Uroš and are visible under his name in the history, e.g. `e0892d7`, `720c05b`, `deedb5e`, `0909b51`, `4a9ae35` (`git log --author="Uroš"`).

## Limits of this record

- File-level attribution for the "Uroš (authored locally)" rows comes from the team's own reports; it cannot be confirmed from Git authorship. If the local Week 04 working copy or its file timestamps are still available, they are the independent evidence and can be added here.
- Nothing in this file changes the code or the recorded results (55/55 tests, typecheck, build, security scan).
