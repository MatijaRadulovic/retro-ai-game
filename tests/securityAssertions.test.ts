import test from "node:test";
import assert from "node:assert/strict";
import { assertNoAgentSideEffects, assertProviderCalls } from "./helpers/securityAssertions.ts";

test("shared assertions report provider and side-effect boundary violations", () => {
  assertProviderCalls(0, 0);
  assert.throws(() => assertProviderCalls(1, 0), /expected 0/);
  assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 0, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 2 } });
  assert.throws(() => assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 1, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 2 } }), /tool calls/);
  assert.throws(() => assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 0, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 3 } }), /snapshot changed/);
});
