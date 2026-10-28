import test from "node:test";
import assert from "node:assert/strict";
import { createFakeClock, createTrackedProvider, deferred } from "./helpers/securityFixtures.ts";
import type { ProviderResponse } from "../server/ai/shopAdvice.ts";
import type { AgentStepRequest } from "../server/agent/types.ts";
import type { AdviceModel } from "../src/ai/shopAdvice.ts";

test("fake clock advances deterministically and refuses backwards movement", () => {
  const clock = createFakeClock(100);
  assert.equal(clock.now(), 100);
  assert.equal(clock.advance(25), 125);
  assert.throws(() => clock.advance(-1), /non-negative/);
  assert.throws(() => clock.set(124), /cannot move backwards/);
  assert.equal(clock.now(), 125);
});

test("tracked fake provider records calls and concurrent attempts without touching the network", async () => {
  const first = deferred<ProviderResponse>();
  const second = deferred<ProviderResponse>();
  const pending = [first, second];
  const fake = createTrackedProvider(async () => pending.shift()!.promise);
  const model = "gemini-3.8-flash" as AdviceModel;
  const request = { goal: "plan_next_purchases", tools: [], transcript: [], budget: { stepsLeft: 5, toolCallsLeft: 4 } } as AgentStepRequest;

  const callA = fake.transport(model, request, new AbortController().signal);
  const callB = fake.transport(model, request, new AbortController().signal);
  assert.equal(fake.calls.length, 2);
  assert.equal(fake.activeCalls, 2);
  assert.equal(fake.maxConcurrentCalls, 2);
  first.resolve({ value: { kind: "final", result: {} } });
  second.resolve({ value: { kind: "final", result: {} } });
  await Promise.all([callA, callB]);
  assert.equal(fake.activeCalls, 0);
  assert.equal(fake.calls[0].request.transcript.length, 0);
});
