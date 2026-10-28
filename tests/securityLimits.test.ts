import test from "node:test";
import assert from "node:assert/strict";
import { W08_SECURITY_LIMITS } from "../server/security/securityLimits.ts";

test("W08 security limits are fixed, bounded, and match the approved local profile", () => {
  assert.equal(W08_SECURITY_LIMITS.requestBodyBytes, 16_384);
  assert.equal(W08_SECURITY_LIMITS.rateWindowMs, 60_000);
  assert.deepEqual(W08_SECURITY_LIMITS.session, {
    idleTtlMs: 30 * 60_000,
    absoluteTtlMs: 8 * 60 * 60_000,
    maxActive: 100,
    maxCreationsPerWindow: 20,
  });
  assert.deepEqual(W08_SECURITY_LIMITS.game, {
    idleTtlMs: 30 * 60_000,
    maxPerScope: 3,
    maxProcess: 100,
  });
  assert.deepEqual(W08_SECURITY_LIMITS.subscription, {
    maxPerGame: 1,
    maxPerScope: 3,
    maxProcess: 100,
  });
  assert.deepEqual(W08_SECURITY_LIMITS.agent, {
    maxActivePerScope: 1,
    maxActiveProcess: 2,
    maxAcceptedPerScopePerWindow: 5,
    maxAcceptedProcessPerWindow: 20,
    maxDecisions: 5,
    maxToolCalls: 4,
    maxEvaluatorCalls: 2,
    maxProviderAttempts: 8,
    maxProviderFallbacks: 2,
    providerResponseBytes: 16_384,
    modelTextChars: 4_096,
    toolResultBytes: 4_096,
    providerCallTimeoutMs: 10_000,
    totalDeadlineMs: 45_000,
  });
  assert.equal(Object.isFrozen(W08_SECURITY_LIMITS), true);
  assert.equal(Object.isFrozen(W08_SECURITY_LIMITS.agent), true);
});
