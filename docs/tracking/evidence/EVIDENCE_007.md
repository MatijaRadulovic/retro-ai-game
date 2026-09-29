# Evidence 007 — Gemini Hint security and integration plan

## Record and task context

- **Purpose / accepted goal:** turn the user's approved Gemini Hint direction into a bounded security/reliability plan, update permanent guidance, and add an enforced pre-push secret/frontend scan.
- **Governing spec/task plan:** [Gemini Hint integration plan](../../specs/GEMINI_HINT_INTEGRATION.md).
- **Exact prompt artifact and version:** [Build prompt Gemini Hint v1](../../prompts/week4/BUILD_PROMPT_GEMINI_HINT_V1.md); this pass prepared the prompt but did not implement its feature.
- **Starting source/revision or working-tree state:** HEAD `091fe25` (`feat: make Snake server-authoritative`). At intake, user changes were present in `docs/tracking/AI_USAGE_LOG.md`, `docs/tracking/WORK_LOG.md`, `.agents/`, `.specify/`, `docs/prompts/week4/BUILD_PROMPT_POWERUPS_PERKS_V1.md`, `docs/tracking/evidence/EVIDENCE_006.md`, and `specs/`; these were preserved.
- **Sources actually used:** user's request; `AGENTS.md`; docs instructions 03–05; game/tool specs; Week 4 checklist/guide; both attached provider reliability/API addenda; Vite config, frontend Hint call site, Node API server, package scripts, ignore rules, and current git status.
- **Relevant sources excluded and why:** no secret-file contents were opened; no secret values were supplied. Other assignment examples for OpenAI, Gemma, replay summary, and generic tool loops were excluded from project scope.
- **Conflict priority and risks:** user's current request explicitly authorizes one Gemini-backed Hint and supersedes prior mock-only restriction. No live provider code is implemented in this pass. Secret files remain unread.
- **Scope / out of scope:** docs, security rules, push hook, and exposure inspection only. No Gemini SDK, endpoint, API key, or live request added.

## Baseline

- The game and Hint behavior before this task were not re-run; implementation baseline is **not recorded** in this documentation/security planning pass.
- Existing frontend code imported the fake Hint model in `src/main.ts`; Vite config had no environment `define` injection and source search found no `GEMINI_API_KEY`, `VITE_*KEY`, or `import.meta.env` references. `server/index.ts` read only `PORT` from the environment.
- `.gitignore` ignored `.env` and `.env.*` while allowing `.env.example`. `dist/` existed and was included in the security scan without reading environment files.
- No provider key was supplied, so this check establishes absence of key references and key-shaped literals found by the guard; it cannot compare the repository against an unknown real credential.

## Frozen eval scenarios and before/after results

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| S1 | Inspect source/Vite/client outputs for provider key references | No credential reaches browser source or built assets | Fake-only frontend; no provider check recorded | Passed for current source/build | Vite/source and existing `dist` scan found no known credential pattern or Gemini/Vite secret reference; no actual key was supplied for comparison |
| S2 | Push guard scans outgoing commits and worktree | Credential-shaped values are reported without printing value; secret paths rejected without opening | No project pre-push guard | Passed | Full hook scanned 8 reachable commits; synthetic key fixture was rejected/redacted; outgoing empty `.env` fixture rejected without reading contents |
| S3 | Examine local secret handling | `.env` content remains unread; filename/ignore/commit status can be checked | `.env*` ignored except example | Passed | `git check-ignore -v` confirmed `.env`/`.env.local` ignored and `.env.example` allowed; no secret-file contents read |
| S4 | Gemini integration reliability | Async request, 8-second overall deadline, 2 attempts maximum, transient-only retry, safe local fallback | Capability absent (N/A) | Plan defined | Implementation and provider behavior not verified |

## Controlled change — iteration 1

- **Hypothesis / reason:** a narrow written provider contract plus an enabled, tracked pre-push guard will prevent accidental key exposure while defining bounded behavior before SDK code is added.
- **Single bounded change:** update security/project/spec guidance and add a dependency-free pre-push scanner/hook; record future implementation prompt.
- **Files changed:** `AGENTS.md`; `docs/instructions/03-ai-hint-and-security.md`; `docs/specs/GAME_SPEC.md`; `docs/specs/TOOL_CONTRACT.md`; new Gemini plan/prompt/evidence files; `.githooks/pre-push`; scanner script; work log and AI usage log.
- **Out of scope preserved:** live Gemini SDK integration, real credentials, live calls, unrelated powerups work.

## After verification

- **Commands/results:** `npm run security:scan` passed; simulated initial-remote push through `.githooks/pre-push` scanned 8 locally reachable commits and passed; `git diff --check` passed. A temporary browser-source fixture with a synthetic Google-key-shaped value failed the guard and its value was not printed. A temporary Git repository with an empty committed `.env` was rejected by the outgoing-commit scan, and the scanner reported that file contents were not read.
- **Recorded output:**

  ```text
  $ npm run security:scan
  > retro-snake@0.1.0 security:scan
  > node scripts/security/pre-push-scan.mjs --worktree
  Pre-push security scan passed: no known credential patterns or client secret references found.

  $ printf '%s\n' 'refs/heads/main 091fe25dbb1be9163d59f70555b750fcee47ba7e refs/heads/main 0000000000000000000000000000000000000000' | .githooks/pre-push
  Scanned 8 outgoing commit(s) for refs/heads/main -> refs/heads/main.
  Pre-push security scan passed: no known credential patterns or client secret references found.

  $ git diff --check
  exit 0 (no output)

  $ python3 <inline Markdown-link scan>
  All Markdown link targets resolve.

  $ node --check scripts/security/pre-push-scan.mjs
  exit 0 (no output)

  Synthetic key-like source fixture: rejected; value redacted.
  Outgoing empty .env fixture: rejected; contents were not read.
  ```
- **Manual source inspection:** Vite config had no `define` injection; `src/main.ts` used the fake model; no environment-backed browser references were found by a source search that excluded all environment/secret files.
- **Skipped checks:** `npm run typecheck`, `npm test`, and `npm run build` were not run because no game/application implementation or TypeScript source changed. This pass added a standalone Node security guard and documentation only.
- **Live smoke:** not run; Gemini integration is not implemented.

## Honest limitations

The scanner is a defense-in-depth heuristic for known credential formats and explicit client references; it cannot prove a credential is absent if it uses an unknown format. It intentionally never reads `.env` or equivalent secret files. The current review did not know an actual key to compare. No runtime Gemini request, timeout, retry, fallback, or generated Hint behavior has been verified.
