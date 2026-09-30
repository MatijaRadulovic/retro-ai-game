import test from "node:test";
import assert from "node:assert/strict";
import { GameSessionManager } from "../server/gameSession.ts";
import {
  createJsonAdviceTelemetrySink,
  createShopAdvisor,
  deriveShopContext,
  ProviderFailure,
  validateModelDecision,
  type AdviceAttemptTelemetry,
  type ProviderResponse,
} from "../server/ai/shopAdvice.ts";
import { createGeminiTransport } from "../server/ai/geminiTransport.ts";
import { SHOP_ADVISOR_SYSTEM_PROMPT } from "../server/ai/shopPrompt.ts";
import { validateShopAdviceResult } from "../src/ai/shopAdvice.ts";

const VALID_DECISION = { decision: "wait", reasonCode: "cannot_afford" } as const;

function providerResponse(value: unknown = VALID_DECISION): ProviderResponse {
  return { value };
}

function providerEnvelope(text: string, usageMetadata?: Record<string, number>): string {
  return JSON.stringify({
    candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }],
    usageMetadata,
  });
}

function pausedManager(): { manager: GameSessionManager; id: string } {
  let nextId = 0;
  const manager = new GameSessionManager(() => 0, () => `advice-${++nextId}`);
  const game = manager.create();
  manager.move(game.id, "up");
  manager.pause(game.id);
  return { manager, id: game.id };
}

function richContext() {
  const { manager, id } = pausedManager();
  const snapshot = manager.get(id);
  snapshot.players[0].progression.perkPoints = 8;
  return deriveShopContext(snapshot);
}

test("shop context contains only progression and perk facts from a paused run", () => {
  const context = richContext();
  assert.ok(context);
  assert.equal(context.status, "paused");
  assert.equal(context.perkPoints, 8);
  assert.equal(context.extraXp.nextCost, 1);
  assert.equal(context.extraLife.nextCost, 5);
  assert.equal("snake" in context, false);
  assert.equal("food" in context, false);
  assert.equal("key" in context, false);
});

test("model decision separates exact schema from game semantics", () => {
  const context = richContext();
  assert.ok(context);
  assert.deepEqual(validateModelDecision({ decision: "buy_extra_xp", reasonCode: "faster_xp" }, context),
    { decision: "buy_extra_xp", reasonCode: "faster_xp" });
  assert.equal(validateModelDecision({ decision: "buy_extra_xp", reasonCode: "faster_xp", execute: "buy" }, context), null);
  assert.equal(validateModelDecision({ decision: "buy_extra_xp", reasonCode: "collision_protection" }, context), null);
  assert.equal(validateModelDecision({ decision: "buy_extra_life", reasonCode: "collision_protection" },
    { ...context, perkPoints: 0 }), null);
  assert.equal(validateModelDecision({ decision: "buy_extra_xp", reasonCode: "faster_xp" },
    { ...context, extraXp: { level: 5, nextCost: null } }), null);
});

test("primary success emits one sanitized attempt with normalized usage and changes no state", async () => {
  const { manager, id } = pausedManager();
  const before = manager.get(id);
  const events: AdviceAttemptTelemetry[] = [];
  const advisor = createShopAdvisor(async () => ({
    value: VALID_DECISION,
    usage: { inputTokens: 31, outputTokens: 7, totalTokens: 38 },
  }), {
    telemetry: (event) => events.push(event),
    interactionId: () => "interaction-1",
  });
  const result = await advisor.advise(manager, id);
  assert.equal(result.status, "advice");
  assert.deepEqual(manager.get(id), before);
  assert.deepEqual(events, [{
    event: "shop_ai_provider_attempt",
    interactionId: "interaction-1",
    operation: "shop_advice",
    provider: "google",
    model: "gemini-3.8-flash",
    adapter: "gemini_structured",
    phase: "final_output",
    attempt: 1,
    attemptLimit: 6,
    modelAttempt: 1,
    modelAttemptLimit: 1,
    attemptKind: "initial",
    status: "success",
    latencyMs: events[0]?.latencyMs ?? 0,
    fallbackUsed: false,
    cacheStatus: "not_used",
    primarySkippedForCongestion: false,
    usage: { inputTokens: 31, outputTokens: 7, totalTokens: 38 },
  }]);
  assert.deepEqual(validateShopAdviceResult(result), result);
});

test("eligible failures follow the exact Flash x1, Flash-Lite x2, Gemma x3 chain", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  const events: AdviceAttemptTelemetry[] = [];
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    throw new ProviderFailure("transient", 503);
  }, {
    backoffScheduleMs: [0, 0, 0, 0, 0],
    jitter: () => 0.5,
    telemetry: (event) => events.push(event),
  });
  assert.equal((await advisor.advise(manager, id)).status, "unavailable");
  assert.deepEqual(calls, [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite", "gemini-3.5-flash-lite",
    "gemma-4-26b-a4b-it", "gemma-4-26b-a4b-it", "gemma-4-26b-a4b-it",
  ]);
  assert.deepEqual(events.map((event) => event.attemptKind), ["initial", "fallback", "retry", "fallback", "retry", "retry"]);
  assert.deepEqual(events.map((event) => event.attempt), [1, 2, 3, 4, 5, 6]);
  assert.equal(events[3].adapter, "gemma_json");
  assert.equal(events[3].status, "failure");
});

test("Flash-Lite and Gemma can each return the final validated advice", async () => {
  for (const successModel of ["gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"] as const) {
    const { manager, id } = pausedManager();
    const calls: string[] = [];
    const advisor = createShopAdvisor(async (model) => {
      calls.push(model);
      if (model !== successModel) throw new ProviderFailure("transient", 503);
      return providerResponse();
    }, { backoffScheduleMs: [0, 0, 0, 0, 0], jitter: () => 0.5 });
    const result = await advisor.advise(manager, id);
    assert.equal(result.status, "advice");
    if (result.status === "advice") assert.equal(result.model, successModel);
    assert.equal(calls.at(-1), successModel);
  }
});

test("transient failures apply the configured base delays with deterministic jitter", async () => {
  const { manager, id } = pausedManager();
  const delays: number[] = [];
  const advisor = createShopAdvisor(async () => {
    throw new ProviderFailure("transient", 503);
  }, {
    wait: async (delay) => { delays.push(delay); return true; },
    jitter: () => 0.5,
  });
  await advisor.advise(manager, id);
  assert.deepEqual(delays, [1_000, 3_000, 5_000, 5_000, 5_000]);
});

test("Retry-After within policy is honored before the next approved model", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  const delays: number[] = [];
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    if (calls.length === 1) throw new ProviderFailure("transient", 429, 2_000, "rate_limited");
    return providerResponse();
  }, {
    wait: async (delay) => { delays.push(delay); return true; },
    jitter: () => 0.5,
  });
  assert.equal((await advisor.advise(manager, id)).status, "advice");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite"]);
  assert.deepEqual(delays, [2_000]);
});

test("Retry-After beyond policy skips remaining attempts for that model", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  const delays: number[] = [];
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") throw new ProviderFailure("transient", 503);
    if (model === "gemini-3.5-flash-lite") throw new ProviderFailure("transient", 429, 30_000, "rate_limited");
    return providerResponse();
  }, {
    backoffScheduleMs: [0, 0, 0, 0, 0],
    wait: async (delay) => { delays.push(delay); return true; },
    jitter: () => 0.5,
  });
  assert.equal((await advisor.advise(manager, id)).status, "advice");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]);
  assert.deepEqual(delays, [0]);
});

test("confirmed model 404 skips that model's remaining attempts without a delay", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    if (model !== "gemma-4-26b-a4b-it") throw new ProviderFailure("capability", 404);
    return providerResponse();
  });
  assert.equal((await advisor.advise(manager, id)).status, "advice");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"]);
});

test("two transient Flash failures across requests open the 15-minute congestion window", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  let currentTime = 1_000;
  let primaryCalls = 0;
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") {
      primaryCalls += 1;
      if (primaryCalls <= 2) throw new ProviderFailure("transient", 503);
    }
    return providerResponse();
  }, {
    backoffScheduleMs: [0, 0, 0, 0, 0],
    jitter: () => 0.5,
    now: () => currentTime,
  });

  await advisor.advise(manager, id);
  await advisor.advise(manager, id);
  await advisor.advise(manager, id);
  assert.deepEqual(calls, [
    "gemini-3.8-flash", "gemini-3.5-flash-lite",
    "gemini-3.8-flash", "gemini-3.5-flash-lite",
    "gemini-3.5-flash-lite",
  ]);
  currentTime += 15 * 60_000 + 1;
  await advisor.advise(manager, id);
  assert.equal(calls.at(-1), "gemini-3.8-flash");
});

test("successful Flash request resets a prior consecutive-failure count", async () => {
  const { manager, id } = pausedManager();
  const calls: string[] = [];
  let primaryAttempt = 0;
  const advisor = createShopAdvisor(async (model) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") {
      primaryAttempt += 1;
      if (primaryAttempt === 1 || primaryAttempt === 3) throw new ProviderFailure("transient", 503);
    }
    return providerResponse();
  }, {
    backoffScheduleMs: [0, 0, 0, 0, 0],
    jitter: () => 0.5,
  });
  await advisor.advise(manager, id);
  assert.equal(calls[0], "gemini-3.8-flash");
  assert.equal(calls[1], "gemini-3.5-flash-lite");

  await advisor.advise(manager, id);
  assert.equal(calls[2], "gemini-3.8-flash");

  await advisor.advise(manager, id);
  assert.equal(calls[3], "gemini-3.8-flash");
  assert.equal(calls[4], "gemini-3.5-flash-lite");

  await advisor.advise(manager, id);
  assert.equal(calls[5], "gemini-3.8-flash");
});

test("terminal authentication failure emits one safe event and never falls back", async () => {
  const { manager, id } = pausedManager();
  const events: AdviceAttemptTelemetry[] = [];
  let calls = 0;
  const advisor = createShopAdvisor(async () => {
    calls += 1;
    throw new ProviderFailure("terminal", 401);
  }, { telemetry: (event) => events.push(event) });
  assert.equal((await advisor.advise(manager, id)).status, "unavailable");
  assert.equal(calls, 1);
  assert.equal(events[0].errorClass, "unauthorized");
  assert.equal(events[0].providerStatus, 401);
});

test("bad request, permission, and conflict statuses are terminal without fallback", async () => {
  for (const status of [400, 403, 409]) {
    const { manager, id } = pausedManager();
    let calls = 0;
    const transport = createGeminiTransport("placeholder-only", (async () => {
      calls += 1;
      return new Response("private upstream detail", { status });
    }) as typeof fetch);
    const result = await createShopAdvisor(transport).advise(manager, id);
    assert.equal(result.status, "unavailable");
    assert.equal(calls, 1);
  }
});

test("empty provider output is terminal and receives its own failure class", async () => {
  const { manager, id } = pausedManager();
  let calls = 0;
  const transport = createGeminiTransport("placeholder-only", (async () => {
    calls += 1;
    return new Response(JSON.stringify({ candidates: [] }), { status: 200 });
  }) as typeof fetch);
  const events: AdviceAttemptTelemetry[] = [];
  const result = await createShopAdvisor(transport, { telemetry: (event) => events.push(event) }).advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
  assert.equal(events[0].errorClass, "empty_output");
});

test("invalid model JSON is terminal and receives its own failure class", async () => {
  const { manager, id } = pausedManager();
  let calls = 0;
  const transport = createGeminiTransport("placeholder-only", (async () => {
    calls += 1;
    return new Response(providerEnvelope("{not-json"), { status: 200 });
  }) as typeof fetch);
  const events: AdviceAttemptTelemetry[] = [];
  const result = await createShopAdvisor(transport, { telemetry: (event) => events.push(event) }).advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
  assert.equal(events[0].errorClass, "invalid_json");
});

test("schema-invalid parsed JSON is terminal and receives its own failure class", async () => {
  const { manager, id } = pausedManager();
  const events: AdviceAttemptTelemetry[] = [];
  let calls = 0;
  const advisor = createShopAdvisor(async () => {
    calls += 1;
    return providerResponse({ decision: "wait" });
  }, { telemetry: (event) => events.push(event) });
  const result = await advisor.advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
  assert.equal(events[0].errorClass, "schema_invalid");
});

test("semantically invalid schema-valid advice is terminal and receives its own failure class", async () => {
  const { manager, id } = pausedManager();
  const events: AdviceAttemptTelemetry[] = [];
  let calls = 0;
  const advisor = createShopAdvisor(async () => {
    calls += 1;
    return providerResponse({ decision: "buy_extra_life", reasonCode: "collision_protection" });
  }, { telemetry: (event) => events.push(event) });
  const result = await advisor.advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
  assert.equal(events[0].errorClass, "semantic_invalid");
});

test("provider refusal is terminal and never activates another model", async () => {
  const { manager, id } = pausedManager();
  let calls = 0;
  const transport = createGeminiTransport("placeholder-only", (async () => {
    calls += 1;
    return new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } }), { status: 200 });
  }) as typeof fetch);
  const result = await createShopAdvisor(transport).advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.equal(calls, 1);
});

test("advice is discarded after authoritative revision changes", async () => {
  const { manager, id } = pausedManager();
  const advisor = createShopAdvisor(async () => {
    manager.restart(id);
    return providerResponse();
  });
  const result = await advisor.advise(manager, id);
  assert.equal(result.status, "unavailable");
  if (result.status === "unavailable") assert.equal(result.code, "stale");
});

test("client cancellation and duplicate request settle safely", async () => {
  const { manager, id } = pausedManager();
  const controller = new AbortController();
  let calls = 0;
  const advisor = createShopAdvisor(async (_model, _context, signal) => {
    calls += 1;
    return new Promise<ProviderResponse>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    });
  });
  const first = advisor.advise(manager, id, controller.signal);
  const busy = await advisor.advise(manager, id);
  assert.equal(busy.status, "unavailable");
  if (busy.status === "unavailable") assert.equal(busy.code, "busy");
  controller.abort();
  const cancelled = await first;
  assert.equal(cancelled.status, "unavailable");
  if (cancelled.status === "unavailable") assert.equal(cancelled.code, "cancelled");
  assert.equal(calls, 1);
});

test("attempt timeout and total deadline prevent an indefinite wait", async () => {
  const { manager, id } = pausedManager();
  let calls = 0;
  const advisor = createShopAdvisor(async () => {
    calls += 1;
    return new Promise<ProviderResponse>(() => {});
  }, { deadlineMs: 35, attemptTimeoutMs: 10, backoffScheduleMs: [0, 0, 0, 0, 0], jitter: () => 0.5 });
  const started = Date.now();
  const result = await advisor.advise(manager, id);
  assert.equal(result.status, "unavailable");
  assert.ok(Date.now() - started < 250);
  assert.ok(calls <= 6);
});

test("Gemini adapter sends native structured output and normalizes token usage", async () => {
  const context = richContext();
  assert.ok(context);
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent");
    const headers = init?.headers as Record<string, string>;
    assert.equal(headers["x-goog-api-key"], "placeholder-only");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.systemInstruction.parts[0].text, SHOP_ADVISOR_SYSTEM_PROMPT);
    assert.equal("system_instruction" in body, false);
    assert.equal(body.generationConfig.responseFormat.text.mimeType, "APPLICATION_JSON");
    assert.equal(body.generationConfig.maxOutputTokens, 128);
    assert.ok(!String(init?.body).includes("placeholder-only"));
    return new Response(providerEnvelope(JSON.stringify({ decision: "buy_extra_xp", reasonCode: "faster_xp" }), {
      promptTokenCount: 20,
      candidatesTokenCount: 6,
      totalTokenCount: 26,
    }), { status: 200 });
  };
  const response = await createGeminiTransport("placeholder-only", fakeFetch as typeof fetch)(
    "gemini-3.8-flash", context, new AbortController().signal,
  );
  assert.deepEqual(response, {
    value: { decision: "buy_extra_xp", reasonCode: "faster_xp" },
    usage: { inputTokens: 20, outputTokens: 6, totalTokens: 26, cachedTokens: undefined, thoughtTokens: undefined },
  });
});

test("Gemma adapter uses its separate text-JSON capability branch", async () => {
  const context = richContext();
  assert.ok(context);
  const fakeFetch = async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
    assert.equal(String(url), "https://generativelanguage.googleapis.com/v1beta/models/gemma-4-26b-a4b-it:generateContent");
    const body = JSON.parse(String(init?.body));
    assert.match(body.systemInstruction.parts[0].text, /Return only one JSON object/);
    assert.equal(body.generationConfig.responseFormat, undefined);
    assert.equal(body.generationConfig.maxOutputTokens, 128);
    assert.equal(body.generationConfig.temperature, 1);
    return new Response(providerEnvelope(JSON.stringify(VALID_DECISION)), { status: 200 });
  };
  const response = await createGeminiTransport("placeholder-only", fakeFetch as typeof fetch)(
    "gemma-4-26b-a4b-it", context, new AbortController().signal,
  );
  assert.deepEqual(response.value, VALID_DECISION);
});

test("transport classifies 404 capability and preserves long Retry-After without provider text", async () => {
  const context = richContext();
  assert.ok(context);
  const notFound = createGeminiTransport("placeholder-only", (async () =>
    new Response("private upstream detail", { status: 404 })) as typeof fetch);
  await assert.rejects(() => notFound("gemini-3.8-flash", context, new AbortController().signal),
    (error: unknown) => error instanceof ProviderFailure && error.kind === "capability"
      && error.status === 404 && !error.message.includes("private upstream"));

  const rateLimited = createGeminiTransport("placeholder-only", (async () =>
    new Response("private upstream detail", { status: 429, headers: { "retry-after": "30" } })) as typeof fetch);
  await assert.rejects(() => rateLimited("gemini-3.8-flash", context, new AbortController().signal),
    (error: unknown) => error instanceof ProviderFailure && error.kind === "transient"
      && error.retryAfterMs === 30_000 && !error.message.includes("private upstream"));
});

test("JSON telemetry logging is single-line and contains no request, key, or game data", async () => {
  const { manager, id } = pausedManager();
  const lines: string[] = [];
  const advisor = createShopAdvisor(async () => ({
    value: VALID_DECISION,
    usage: { totalTokens: 12 },
  }), {
    telemetry: createJsonAdviceTelemetrySink((line) => lines.push(line)),
    interactionId: () => "opaque-interaction",
  });
  await advisor.advise(manager, id);
  assert.equal(lines.length, 1);
  assert.equal(lines[0].includes("\n"), false);
  const logged = JSON.parse(lines[0]);
  assert.equal(logged.model, "gemini-3.8-flash");
  assert.equal(logged.usage.totalTokens, 12);
  for (const forbidden of ["apiKey", "prompt", "response", "gameId", id, "perkPoints", "placeholder-only"]) {
    assert.equal(lines[0].includes(forbidden), false);
  }
});

test("public result parser accepts Gemma model and rejects extra fields", () => {
  const base = { status: "advice", revision: 2, decision: "buy_luck", reasonCode: "more_lucky",
    message: "BUY LUCK FOR 1 POINT.", model: "gemma-4-26b-a4b-it" };
  assert.deepEqual(validateShopAdviceResult(base), base);
  assert.equal(validateShopAdviceResult({ ...base, apiKey: "placeholder-only" }), null);
  assert.equal(validateShopAdviceResult({ ...base, reasonCode: "faster_xp" }), null);
});
