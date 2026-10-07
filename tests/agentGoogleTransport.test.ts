import test from "node:test";
import assert from "node:assert/strict";
import { createGoogleAgentTransport } from "../server/agent/googleTransport.ts";
import { AGENT_SYSTEM_PROMPT } from "../server/agent/prompt.ts";
import { ProviderFailure } from "../server/ai/shopAdvice.ts";
import type { AgentStepRequest } from "../server/agent/types.ts";
import { ADVICE_MODELS } from "../src/ai/shopAdvice.ts";

const KEY = "unit-test-placeholder";
const request: AgentStepRequest = {
  goal: "plan_next_purchases",
  tools: [{ name: "get_shop_state", description: "d", arguments: "{}" }],
  transcript: [],
  budget: { stepsLeft: 5, toolCallsLeft: 4 },
};

function reply(text: string, status = 200, headers: Record<string, string> = {}): Response {
  const body = status === 200
    ? JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } })
    : "{}";
  return new Response(body, { status, headers });
}

async function failureOf(fetchImpl: typeof fetch): Promise<ProviderFailure> {
  try {
    await createGoogleAgentTransport(KEY, fetchImpl)(ADVICE_MODELS[0], request, new AbortController().signal);
  } catch (error) {
    assert.ok(error instanceof ProviderFailure);
    return error;
  }
  throw new Error("expected a failure");
}

test("sends one server-side request with the key only in a header", async () => {
  let seen: { url: string; init: RequestInit } | undefined;
  const fetchImpl: typeof fetch = async (url, init) => { seen = { url: String(url), init: init! }; return reply('{"kind":"tool_request","tool":"get_shop_state","arguments":{}}'); };
  const result = await createGoogleAgentTransport(KEY, fetchImpl)(ADVICE_MODELS[1], request, new AbortController().signal);
  assert.deepEqual(result.value, { kind: "tool_request", tool: "get_shop_state", arguments: {} });
  assert.equal(result.usage?.inputTokens, 10);
  assert.equal(result.usage?.outputTokens, 5);
  assert.equal(result.usage?.totalTokens, 15);
  assert.ok(seen);
  assert.ok(seen.url.endsWith(`/v1beta/models/${ADVICE_MODELS[1]}:generateContent`));
  assert.equal((seen.init.headers as Record<string, string>)["x-goog-api-key"], KEY);
  assert.equal(seen.init.redirect, "error");
  const body = String(seen.init.body);
  assert.equal(body.includes(KEY), false);
  assert.ok(body.includes(AGENT_SYSTEM_PROMPT.slice(0, 40)));
  assert.ok(body.includes("plan_next_purchases"));
});

test("the output-token budget leaves room for a full final envelope and any model thinking", async () => {
  let body = "";
  const fetchImpl: typeof fetch = async (_url, init) => { body = String(init?.body); return reply('{"kind":"final","result":{}}'); };
  await createGoogleAgentTransport(KEY, fetchImpl)(ADVICE_MODELS[0], request, new AbortController().signal);
  const { generationConfig } = JSON.parse(body) as { generationConfig: { maxOutputTokens: number } };
  assert.ok(generationConfig.maxOutputTokens >= 1024, `maxOutputTokens ${generationConfig.maxOutputTokens} is too small`);
});

test("Markdown-fenced JSON is accepted; prose, oversized or unfinished output is invalid", async () => {
  const fenced = await createGoogleAgentTransport(KEY, async () => reply('```json\n{"kind":"final","result":{}}\n```'))(ADVICE_MODELS[2], request, new AbortController().signal);
  assert.deepEqual(fenced.value, { kind: "final", result: {} });
  assert.equal((await failureOf(async () => reply("I think you should buy luck."))).errorClass, "invalid_json");
  assert.equal((await failureOf(async () => reply(`{"a":"${"x".repeat(5000)}"}`))).errorClass, "response_too_large");
  const unfinished = async () => new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS", content: { parts: [{ text: "{" }] } }] }), { status: 200 });
  assert.equal((await failureOf(unfinished)).kind, "invalid_output");
});

test("HTTP errors are classified like the W04 transport", async () => {
  const rate = await failureOf(async () => reply("", 429, { "retry-after": "2" }));
  assert.equal(rate.kind, "transient");
  assert.equal(rate.errorClass, "rate_limited");
  assert.equal(rate.retryAfterMs, 2000);
  assert.equal((await failureOf(async () => reply("", 401))).errorClass, "unauthorized");
  assert.equal((await failureOf(async () => reply("", 404))).kind, "capability");
  assert.equal((await failureOf(async () => reply("", 503))).errorClass, "provider_unavailable");
  assert.equal((await failureOf(async () => { throw new Error("socket"); })).errorClass, "network");
});

test("arbitrary model ids and an empty key are refused", async () => {
  const transport = createGoogleAgentTransport(KEY, async () => reply("{}"));
  await assert.rejects(() => transport("gemini-evil" as never, request, new AbortController().signal), (error: unknown) => error instanceof ProviderFailure && error.errorClass === "bad_request");
  assert.throws(() => createGoogleAgentTransport("  "), /not configured/);
});
