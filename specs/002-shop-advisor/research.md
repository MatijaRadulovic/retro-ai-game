# Research: Shop AI Advisor

## Reliability V2 decision — 2026-09-30

**Decision:** The current user request supersedes the original two-model retry counts. Use `gemini-3.8-flash` once, `gemini-3.5-flash-lite` at most twice, then `gemma-4-26b-a4b-it` at most three times. Google documents Gemma 4 26B A4B IT as a hosted Gemini API model and describes its mixture-of-experts form as faster than the dense 31B model. Google pricing lists Gemma 4 inference as free of charge on the free tier, while actual account limits remain visible only in AI Studio.

**Adapter decision:** Gemini models retain native structured output. Gemma uses its own text-JSON request branch with a small output limit and then the same strict parse, schema, and semantic checks. This follows the provider addendum's requirement to isolate model-specific capabilities.

**Reliability decision:** Keep 10 seconds per call and use an 85-second total deadline for six calls plus bounded-jitter delays based on 1/3/5/5/5 seconds. Honor `Retry-After` only when it fits the local five-second wait budget and remaining deadline; otherwise skip remaining attempts for that model. A documented allowlisted model returning `404` is treated as capability unavailable and advances without retrying that model. All other terminal classes stop.

**Telemetry decision:** Normalize safe token counts and emit one server-side structured event per attempt. Do not record raw content, credentials, game/session IDs, or private state.

## Historical initial model choice and quota (superseded by V2)

**Decision:** Use stable `gemini-3.8-flash` first and stable `gemini-3.5-flash-lite` as the approved fallback for this free-tier project. Both support structured output and free-tier standard requests according to Google's [model catalog](https://ai.google.dev/gemini-api/docs/models) and [pricing](https://ai.google.dev/gemini-api/docs/pricing).

**Rationale:** 3.8 Flash is the stronger of this pair; 3.5 Flash-Lite is designed for higher-volume, lower-cost work. The fallback gives a second model-specific quota path when the primary rate-limits or has a transient outage. Google's [rate-limit documentation](https://ai.google.dev/gemini-api/docs/rate-limits) says the actual RPM, TPM, and RPD depend on the project and model and are visible in AI Studio. There is no documented static quota comparison for this user's project, so no fixed allowance is promised.

**Alternatives considered:** 3.1 Pro Preview is unavailable on the free tier and is a preview model. 2.5 models have access restrictions for new projects. Arbitrary browser-selected model IDs expand the trust boundary.

## Provider interface

**Decision:** Use Node's native `fetch` against the server-side [`generateContent` REST endpoint](https://ai.google.dev/gemini-api/docs/generate-content/text-generation), with the key only in the `x-goog-api-key` header. Send `systemInstruction` (the REST API's camelCase JSON field) and a small user content containing the authoritative shop context. Set `generationConfig.responseFormat.text.mimeType` to the REST enum value `APPLICATION_JSON` and include the compact object schema, following Google's [GenerateContent API reference](https://ai.google.dev/api/generate-content) and [structured-output guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output).

**Rationale:** Direct REST has no hidden SDK retries and makes timeout, retry, payload, and header behavior explicit. Google says structured output does not guarantee semantically correct values, so local parse, exact-key, enum, affordability, cap, and revision checks remain mandatory.

**Alternatives considered:** The official SDK provides helpers but may add retry behavior that must be disabled or audited. A provider-neutral router is unnecessary for two allowlisted Gemini models.

## Historical initial reliability policy (superseded by V2)

**Superseded — do not implement from this section.** The authoritative policy is [Reliability V2](#reliability-v2-decision--2026-09-30): one Flash call, up to two Flash-Lite calls, then up to three Gemma 4 calls under an **85-second** deadline (10 seconds per call, 1/3/5/5/5-second bounded-jitter delays). The first draft used a shorter total deadline and two Flash attempts; the exact old wording is preserved only in Git history and [Evidence 009](../../docs/tracking/evidence/EVIDENCE_009.md)/[010](../../docs/tracking/evidence/EVIDENCE_010.md).

**Rules that carried over unchanged into V2:**

- `Retry-After` is bounded by the local five-second wait budget and the remaining deadline.
- After two transient primary failures in a logical request, a process-local `primaryCongestedUntil` marker skips Flash for 15 minutes; a successful Flash call after expiry clears it. Terminal failures never open the marker or route to fallback.
- Terminal cases — missing key, malformed request, 400/401/403/409, unsupported model, refusal, empty or invalid output, semantic violation, and cancellation — do not retry or switch models. A visible unavailable result contains no purchase advice.

## Advice representation

**Decision:** Model output contains exactly `decision` and `reasonCode`. Decisions are `buy_extra_xp`, `buy_luck`, `buy_extra_life`, and `wait`. Reason codes are a small allowlist tied to those decisions. The server generates display text from validated state and reason code.

**Rationale:** This prevents arbitrary model prose from claiming false costs or effects. The model still chooses the strategic action; the server owns legal purchase rules and explanation facts.

**Alternatives considered:** Free-form advice is easier to prompt but cannot be fully checked against the game economy. Auto-purchase would make advice write-capable and is outside scope.

## Staleness and concurrency

**Decision:** Capture the game revision with the shop context. After model completion, re-read the authoritative session and return unavailable if its revision or paused status changed. The browser also ignores replies for a closed shop or changed revision. Allow one in-flight advice request per game; an overlapping request receives a stable busy response without starting another provider call.

**Rationale:** Shop purchases, resumes, and restarts can invalidate advice while it is generated. The dual check covers server and browser presentation races without persisting new game state.
