import assert from "node:assert/strict";

export function assertProviderCalls(actual: number, expected = 0): void {
  assert.equal(actual, expected, `expected ${expected} provider calls, received ${actual}`);
}

export function assertNoAgentSideEffects<T>(input: {
  providerCalls: number;
  toolCalls: number;
  snapshotBefore: T;
  snapshotAfter: T;
}): void {
  assertProviderCalls(input.providerCalls, 0);
  assert.equal(input.toolCalls, 0, `expected 0 tool calls, received ${input.toolCalls}`);
  assert.deepEqual(input.snapshotAfter, input.snapshotBefore, "snapshot changed");
}
