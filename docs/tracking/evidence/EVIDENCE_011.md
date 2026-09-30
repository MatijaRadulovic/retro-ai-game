# Evidence 011 — Correct Gemini REST system instruction field

## Record and task context

- **Purpose / accepted goal:** fix the Gemini HTTP 400 caused by sending the system instruction under the wrong JSON field name.
- **Governing spec/task plan:** [Shop AI Advisor API contract](../../../specs/002-shop-advisor/contracts/shop-advice-api.md) and [Gemini Hint Changes V2](../../specs/GEMINI_HINT_CHANGES_V2.md).
- **Exact prompt artifact and version:** no standalone prompt artifact applies; current user request and runtime error.
- **Starting source/revision or working-tree state:** dirty `main` worktree with the shop-advisor implementation; unrelated user changes preserved.
- **Sources actually used:** current transport, focused fake-transport test, advisor contract/research, project security/testing/workflow instructions, and [Google GenerateContent API reference](https://ai.google.dev/api/generate-content).
- **Relevant sources excluded and why:** secret-file contents and credential values were excluded from the review and are not retained in this repository.
- **Conflict priority and risks:** the project contract controls live-provider use and keeps credentials server-only.
- **Scope / out of scope:** fix REST field casing and cover it in an offline adapter test; live Gemini testing is out of scope under the project contract.

## Baseline

- Runtime event reported `gemini-3.8-flash`, HTTP 400, classified `bad_request`.
- Inspection found the Gemini request serialized `system_instruction`; Google REST uses `systemInstruction`.
- `node --test tests/shopAdvice.test.ts`: exit 0; 26 tests passed before the change. The existing test passed because it asserted the same incorrect snake_case field.

## Frozen eval scenarios and before/after results

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| E1 | Build Gemini request with fake fetch | JSON contains `systemInstruction` with the approved prompt and omits `system_instruction` | Fail: implementation and test expected snake_case | Pass: focused test asserts camelCase and explicitly rejects the snake_case property | Fake transport; no network or credential |

## Controlled change — iteration 1

- **Hypothesis / reason:** camelCase matches Google's REST JSON field name and fixes the malformed request.
- **Single bounded change:** changed the Gemini payload field, strengthened its fake-transport assertion, and corrected the advisor research/contract examples.
- **Files changed:** `server/ai/geminiTransport.ts`, `tests/shopAdvice.test.ts`, `specs/002-shop-advisor/research.md`, and `specs/002-shop-advisor/contracts/shop-advice-api.md`.
- **Out of scope preserved:** no live API calls, credentials, secret files, or browser code were used.

## After verification

- `node --test tests/shopAdvice.test.ts`: exit 0; 26 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 55 passed, 0 failed.
- `npm run build`: exit 0; Vite 6.4.3 built production assets.
- `npm run security:scan`: exit 0; no known credential patterns or client secret references found.
- `git diff --check`: exit 0.
- Live provider verification: not run; prohibited by the project contract. No claim is made that the account accepts this request or model.

## Honest limitations

Offline request-shape tests establish the field casing emitted by the adapter, but they do not establish live model availability or prove that no other provider validation issue remains.
