# Gemini Hint Changes V2

**Status:** Complete offline; live provider verification remains opt-in
**Date:** 2026-09-30
**Governing feature:** [Shop AI Advisor](../../specs/002-shop-advisor/spec.md)

## Goal

Bring the shop advisor into line with the Week 4 provider-reliability addendum: add privacy-safe structured telemetry, cover each structured-output failure layer, handle `Retry-After` without retrying too early, and add Gemma 4 as a final provider-specific fallback.

## Accepted model policy

- Attempt `gemini-3.8-flash` once.
- After an eligible failure, attempt `gemini-3.5-flash-lite` at most twice.
- After eligible Flash-Lite failures, attempt `gemma-4-26b-a4b-it` at most three times.
- Keep every call at or below 10 seconds and all six attempts under one 85-second deadline.
- Use base delays of 1, 3, 5, 5, then 5 seconds with bounded jitter. Tests inject deterministic jitter.
- If a valid `Retry-After` exceeds the permitted wait or remaining deadline, do not retry that model early. Skip its remaining attempts and move to the next approved model, or return safe unavailability when no fallback remains.
- A `404` skips to the next approved capability branch without retrying the missing model. `400`, `401`, `403`, `409`, refusal, cancellation, and invalid output stop immediately.
- Count consecutive transient primary failures across logical requests. Two such failures open the existing 15-minute, process-local Flash congestion window; primary success resets the count.

## Adapter boundaries

- Gemini Flash and Flash-Lite use the native structured-output request schema.
- Gemma 4 has a separate request builder and text-JSON output parser. It uses the same server-only API key, minimal shop context, system instruction, response-size limit, timeout, and application validation.
- All adapters normalize provider output and optional token usage into one internal response type. Raw prompts, raw responses, credentials, game IDs, and session IDs never enter telemetry.

## Structured telemetry

Log one JSON event for every provider attempt. Each event contains only:

- event name and anonymous logical interaction ID;
- operation, provider, model, adapter, phase, ordered attempt number, attempt kind, and configured total-attempt limit;
- success/failure status, safe error class, provider HTTP status when present, latency, fallback use, explicit cache status, congestion skip, and bounded token usage when supplied by the provider.

The production server writes these events as single-line JSON. Tests inject an in-memory sink and verify both the fields and the absence of private content.

## Structured-output failure contract

The implementation and tests distinguish:

1. empty output;
2. invalid JSON;
3. JSON with the wrong response schema;
4. schema-valid output that fails application semantics.

All four are terminal for the logical request and return the same safe public unavailable response without another model call.

## Task checklist

- [x] V2-01 Add this plan, a versioned build prompt, frozen evals, and starting work-log entry.
- [x] V2-02 Extend the allowlisted model contract to include `gemma-4-26b-a4b-it`.
- [x] V2-03 Split Gemini structured-output and Gemma text-JSON request/parse branches behind one normalized transport.
- [x] V2-04 Return sanitized usage metadata from provider adapters without exposing raw payloads.
- [x] V2-05 Add per-attempt structured telemetry and production JSON logging.
- [x] V2-06 Change orchestration to 1 Flash, 2 Flash-Lite, and 3 Gemma attempts under one bounded deadline.
- [x] V2-07 Add bounded jitter, cross-request Flash congestion counting, capability fallback, and safe `Retry-After` skipping.
- [x] V2-08 Add separate tests for empty, invalid JSON, schema-invalid, and semantically invalid output.
- [x] V2-09 Test exact model order/counts, `Retry-After`, telemetry contents/redaction, usage, cancellation, and terminal no-fallback behavior.
- [x] V2-10 Synchronize the feature contract, security instructions, quickstart, integration overview, and tracking records.
- [x] V2-11 Run typecheck, full tests, build, security scan, diff check, and the configured pre-push guard; record actual results.

## Definition of done

The checklist is complete; offline tests deterministically prove the adapter branches and failure policy; production emits sanitized attempt events; the browser contract and game state remain unchanged; required checks pass; and evidence clearly states that live provider behavior and account-specific limits remain unverified without an opt-in live call.
