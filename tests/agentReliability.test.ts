import test from "node:test";
import assert from "node:assert/strict";
import { runAgent } from "../server/agent/orchestrator.ts";
import { ProviderFailure } from "../server/ai/shopAdvice.ts";
import type { AgentAttemptEvent, AgentRunEvent } from "../server/agent/types.ts";
import { ADVICE_MODELS } from "../src/ai/shopAdvice.ts";
import { FAST, SHOP_STATE, evalPlan, finalAnswer, pausedGame, scripted, validResult } from "./support/agentFixtures.ts";

const plan = ["extra_xp"];
const happy = () => [
  SHOP_STATE,
  evalPlan(plan),
  finalAnswer(validResult({ plan, evidence: [{ source: "evaluate_perk_plan", step: 2, finding: "Extra XP is affordable." }] })),
];

async function runWith(items: Parameters<typeof scripted>[0], options: Record<string, unknown> = {}) {
  const { manager, id } = pausedGame(3);
  const script = scripted(items);
  const outcome = await runAgent({ manager, gameId: id, transport: script.transport, deps: FAST, ...options });
  return { outcome, script };
}

test("E06 authentication, permission and bad-request failures make exactly one attempt", async () => {
  for (const status of [400, 401, 403]) {
    const { outcome, script } = await runWith([{ fail: new ProviderFailure("terminal", status) }, ...happy()]);
    assert.equal(outcome.stopReason, "provider_failed");
    assert.equal(outcome.status, "failed");
    assert.equal(script.calls.length, 1, `status ${status}`);
  }
});

test("invalid structured output is a rejected step: no retry and no fallback", async () => {
  const { outcome, script } = await runWith([{ fail: new ProviderFailure("invalid_output", undefined, undefined, "invalid_json") }, ...happy()]);
  assert.equal(outcome.stopReason, "invalid_model_proposal");
  assert.equal(script.calls.length, 1);
});

test("E07 a 429 is retried on the same model within the budget", async () => {
  const { outcome, script } = await runWith([{ fail: new ProviderFailure("transient", 429) }, ...happy()]);
  assert.equal(outcome.stopReason, "completed");
  assert.equal(outcome.providerAttempts, 4);
  assert.equal(script.calls[0].model, ADVICE_MODELS[0]);
  assert.equal(script.calls[1].model, ADVICE_MODELS[0]);
});

test("E07 two transient failures fall back, and the fallback model stays selected", async () => {
  const { outcome, script } = await runWith([
    { fail: new ProviderFailure("transient", 503) },
    { fail: new ProviderFailure("transient", 503) },
    ...happy(),
  ]);
  assert.equal(outcome.stopReason, "completed");
  assert.deepEqual(script.calls.map((call) => call.model), [
    ADVICE_MODELS[0], ADVICE_MODELS[0], ADVICE_MODELS[1], ADVICE_MODELS[1], ADVICE_MODELS[1],
  ]);
});

test("a missing model (capability) falls back without spending a retry", async () => {
  const { outcome, script } = await runWith([{ fail: new ProviderFailure("capability", 404) }, ...happy()]);
  assert.equal(outcome.stopReason, "completed");
  assert.equal(script.calls[1].model, ADVICE_MODELS[1]);
});

test("a long Retry-After skips straight to the next model", async () => {
  const { outcome, script } = await runWith([{ fail: new ProviderFailure("transient", 429, 10_000) }, ...happy()]);
  assert.equal(outcome.stopReason, "completed");
  assert.equal(script.calls[1].model, ADVICE_MODELS[1]);
});

test("E07 persistent transient failures stop within the attempt and fallback budgets", async () => {
  const failures = Array.from({ length: 10 }, () => ({ fail: new ProviderFailure("transient", 503) }));
  const { outcome, script } = await runWith(failures);
  assert.equal(outcome.stopReason, "provider_failed");
  assert.equal(outcome.providerAttempts, 6);
  assert.deepEqual(script.calls.map((call) => call.model), [
    ADVICE_MODELS[0], ADVICE_MODELS[0], ADVICE_MODELS[1], ADVICE_MODELS[1], ADVICE_MODELS[2], ADVICE_MODELS[2],
  ]);
});

test("the whole-run provider attempt budget is shared across steps", async () => {
  const { outcome } = await runWith(
    [{ fail: new ProviderFailure("transient", 429) }, ...happy()],
    { limits: { maxProviderAttempts: 3 } },
  );
  assert.equal(outcome.stopReason, "provider_failed");
  assert.equal(outcome.providerAttempts, 3);
});

test("E08 a provider that never answers ends as deadline and the call is aborted", async () => {
  const { outcome, script } = await runWith([{ hang: true }, { hang: true }, { hang: true }, { hang: true }], {
    limits: { perCallTimeoutMs: 20, totalDeadlineMs: 60 },
  });
  assert.equal(outcome.stopReason, "deadline");
  assert.equal(script.seen.aborted, true);
});

test("E12 cancelling aborts the active call and ends the run as cancelled", async () => {
  const { manager, id } = pausedGame(3);
  const script = scripted([{ hang: true }]);
  const controller = new AbortController();
  const pending = runAgent({ manager, gameId: id, transport: script.transport, deps: FAST, signal: controller.signal });
  await new Promise((resolve) => setTimeout(resolve, 10));
  controller.abort();
  const outcome = await pending;
  assert.equal(outcome.stopReason, "cancelled");
  assert.equal(outcome.status, "stopped");
  assert.equal(script.seen.aborted, true);
  assert.equal(script.calls.length, 1);
});

test("telemetry has one event per attempt plus one run summary, with no prompts or secrets", async () => {
  const events: Array<AgentAttemptEvent | AgentRunEvent> = [];
  const { outcome } = await runWith(
    [{ fail: new ProviderFailure("transient", 429) }, ...happy()],
    { deps: { ...FAST, telemetry: (event: AgentAttemptEvent | AgentRunEvent) => events.push(event) } },
  );
  assert.equal(outcome.stopReason, "completed");
  const attempts = events.filter((event) => event.event === "shop_agent_provider_attempt") as AgentAttemptEvent[];
  assert.equal(attempts.length, 4);
  assert.deepEqual(attempts.map((event) => event.status), ["failure", "success", "success", "success"]);
  assert.equal(attempts[0].errorClass, "rate_limited");
  const summary = events.at(-1) as AgentRunEvent;
  assert.equal(summary.event, "shop_agent_run");
  assert.equal(summary.stopReason, "completed");
  const text = JSON.stringify(events);
  for (const forbidden of ["transcript", "systemInstruction", "apiKey", "x-goog", "fixture-1"]) assert.equal(text.includes(forbidden), false, forbidden);
});

test("a throwing telemetry sink never changes the run", async () => {
  const { outcome } = await runWith(happy(), { deps: { ...FAST, telemetry: () => { throw new Error("sink down"); } } });
  assert.equal(outcome.stopReason, "completed");
});
