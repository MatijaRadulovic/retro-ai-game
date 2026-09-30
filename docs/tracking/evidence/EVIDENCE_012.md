# Evidence 012 — Correct Gemini structured MIME enum and live fallback check

## Record and task context

- **Purpose / accepted goal:** diagnose the remaining Gemini HTTP 400, correct the provider request, and verify one real structured response.
- **Governing spec/task plan:** [Shop Advisor API contract](../../../specs/002-shop-advisor/contracts/shop-advice-api.md), [Gemini Hint Changes V2](../../specs/GEMINI_HINT_CHANGES_V2.md), and the current user request.
- **Exact prompt artifact and version:** no standalone prompt artifact applies.
- **Starting source/revision or working-tree state:** dirty `main` worktree with previous Gemini field-name fix; unrelated user changes preserved.
- **Sources actually used:** current adapter/test/spec, Google’s [GenerateContent API reference](https://ai.google.dev/api/generate-content), and the user-authorized live API responses.
- **Relevant sources excluded and why:** secret-file contents were not accessed. The user-provided key was supplied via hidden terminal input and was not written into files, logs, or this record.
- **Conflict priority and risks:** the user expressly authorized one-time live testing in this request. Credential values are omitted from project records and are not retained in the repository.
- **Scope / out of scope:** correct the Gemini structured-output MIME enum and verify a valid response from the configured fallback. No browser UX or account-quota audit.

## Baseline

- Existing code used `responseFormat.text.mimeType: "application/json"`.
- Authenticated Flash request returned HTTP 400 `INVALID_ARGUMENT`: `Invalid value at 'generation_config.response_format.text.mime_type' ... "application/json"`.
- This provider detail was absent from application telemetry because the transport intentionally discards upstream response bodies.

## Frozen eval scenarios and before/after results

| ID | Scenario / input | Expected result | Baseline | After iteration 1 | Evidence / notes |
|---|---|---|---|---|---|
| E1 | Flash structured request with MIME enum | Request passes payload validation | Fail: 400 rejects lowercase MIME value | Payload passed validation; Flash returned transient 503 high-demand response | Live response; no key or body recorded |
| E2 | Flash-Lite structured request with same adapter | HTTP success and exact validated decision/reason pair | N/A — live fallback not checked | Pass: HTTP 200; valid `buy_extra_xp` / `faster_xp`; usage metadata normalized | Live response; no raw model body recorded |

## Controlled change — iteration 1

- **Hypothesis / reason:** `responseFormat.text.mimeType` is an enum in the REST schema, so it must use the enum value `APPLICATION_JSON`; lowercase `application/json` was rejected.
- **Single bounded change:** changed the MIME enum, updated its adapter assertion, and corrected the research and API contract examples.
- **Files changed:** `server/ai/geminiTransport.ts`, `tests/shopAdvice.test.ts`, `specs/002-shop-advisor/research.md`, and `specs/002-shop-advisor/contracts/shop-advice-api.md`.
- **Out of scope preserved:** no credential or provider output was added to repository files; no game or browser behavior changed.

## After verification

- Live Flash request with corrected payload: HTTP 503; provider reports temporary high demand. This is classified by the application as `provider_unavailable`, eligible for fallback.
- Live Flash-Lite request through `createGeminiTransport`: HTTP 200; adapter parsed a valid `decision` / `reasonCode` pair (`buy_extra_xp` / `faster_xp`) and normalized token usage.
- `node --test tests/shopAdvice.test.ts`: exit 0; 26 passed, 0 failed.
- `npm run typecheck`: exit 0.
- `npm test`: exit 0; 55 passed, 0 failed.
- `npm run build`: exit 0; production assets built successfully.
- `npm run security:scan`: exit 0; no known credential patterns or client secret references found.
- `git diff --check`: exit 0.

## Honest limitations

The live check establishes that Flash-Lite accepted the current structured request and returned a response the adapter parsed; it does not establish stable availability. Flash itself was under high demand during the check. No credential value or raw provider body is retained in the repository.
