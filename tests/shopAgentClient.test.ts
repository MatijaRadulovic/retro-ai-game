import test from "node:test";
import assert from "node:assert/strict";
import { validatePublicAgentRun } from "../src/ai/shopAgent.ts";

const completed = {
  runId: "r1", status: "completed", revision: 4, steps: 3, toolCalls: 2,
  result: {
    summary: "Buy Extra XP.", plan: ["extra_xp"], confidence: "high", completed: true,
    evidence: [{ source: "get_shop_state", step: 1, finding: "3 points." }],
  },
  message: "PLAN: EXTRA XP · COST 1 PT · 2 PT LEFT.",
};
const stopped = { runId: "r2", status: "stopped", revision: 4, steps: 1, toolCalls: 0, stopReason: "unknown_tool", message: "ANALYSIS COULD NOT BE COMPLETED SAFELY. NO PURCHASE WAS MADE." };

test("accepts the two public shapes", () => {
  assert.deepEqual(validatePublicAgentRun(completed), completed);
  assert.deepEqual(validatePublicAgentRun(stopped), stopped);
  assert.deepEqual(validatePublicAgentRun({ ...stopped, status: "failed", stopReason: "provider_failed" })?.status, "failed");
});

test("rejects extra keys, mixed shapes, bad enums and oversized text", () => {
  assert.equal(validatePublicAgentRun({ ...completed, extra: 1 }), null);
  assert.equal(validatePublicAgentRun({ ...stopped, result: completed.result }), null);
  assert.equal(validatePublicAgentRun({ ...completed, stopReason: "completed" }), null);
  assert.equal(validatePublicAgentRun({ ...stopped, stopReason: "mystery" }), null);
  assert.equal(validatePublicAgentRun({ ...stopped, stopReason: "completed" }), null);
  assert.equal(validatePublicAgentRun({ ...completed, status: "running" }), null);
  assert.equal(validatePublicAgentRun({ ...completed, message: "x".repeat(201) }), null);
  assert.equal(validatePublicAgentRun({ ...completed, revision: -1 }), null);
  assert.equal(validatePublicAgentRun({ ...completed, result: { ...completed.result, plan: ["buy_all"] } }), null);
  assert.equal(validatePublicAgentRun({ ...completed, result: { ...completed.result, completed: false } }), null);
  assert.equal(validatePublicAgentRun({ ...completed, result: { ...completed.result, evidence: [{ source: "x", step: 1, finding: "y" }] } }), null);
  assert.equal(validatePublicAgentRun(null), null);
});

test("HTML-looking model text is data: it validates and the UI renders it with textContent", () => {
  const html = { ...completed, result: { ...completed.result, summary: "<img src=x onerror=alert(1)>" } };
  assert.notEqual(validatePublicAgentRun(html), null);
});
