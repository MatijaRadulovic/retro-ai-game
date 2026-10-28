import test from "node:test";
import assert from "node:assert/strict";
import { createAgentSecurityEvent, createSecurityEvent, emitSecurityEvent } from "../server/security/securityEvents.ts";

test("security event has an exact bounded schema and drops attacker-controlled values", () => {
  const event = createSecurityEvent({
    operation: "shop_agent", reason: "request_forbidden\nW08_SERVER_SECRET_DO_NOT_EXPOSE", status: 403,
    correlationId: "../../game?secret=sentinel",
  });
  assert.deepEqual(Object.keys(event).sort(), ["correlationId", "event", "kind", "operation", "outcome", "providerAttempts", "reason", "status", "toolCalls"]);
  assert.equal(event.event, "w08_security_event");
  assert.equal(event.kind, "request_denied");
  assert.equal(event.providerAttempts, 0);
  assert.equal(event.toolCalls, 0);
  assert.equal(event.operation, "shop_agent");
  assert.equal(event.reason, "request_rejected");
  assert.equal(event.status, 403);
  assert.match(event.correlationId, /^[0-9a-f-]{36}$/i);
  assert.equal(JSON.stringify(event).includes("W08_SERVER_SECRET"), false);
  assert.equal(JSON.stringify(event).includes("secret=sentinel"), false);
});

test("agent provider, tool rejection and run events share the bounded W08 schema", () => {
  const correlationId = "123e4567-e89b-42d3-a456-426614174000";
  const provider = createAgentSecurityEvent({
    event: "shop_agent_provider_attempt", runId: "private-run-id", step: 999, attempt: 999,
    model: "not-a-model" as never, status: "failure", errorClass: "timeout", providerAttempts: 999,
    toolCalls: 999, latencyMs: 999_999, usage: { inputTokens: 10, outputTokens: 20 },
  }, correlationId);
  assert.deepEqual(Object.keys(provider).sort(), ["attempt", "correlationId", "event", "kind", "latencyMs", "model", "operation", "outcome", "providerAttempts", "reason", "step", "toolCalls"]);
  assert.equal(provider.correlationId, correlationId);
  assert.equal(provider.kind, "provider_attempt");
  assert.equal(provider.providerAttempts, 8);
  assert.equal(provider.toolCalls, 4);
  assert.equal(provider.step, 5);
  assert.equal(provider.latencyMs, 10_000);
  assert.equal(provider.reason, "timeout");
  assert.equal(JSON.stringify(provider).includes("private-run-id"), false);
  assert.equal(JSON.stringify(provider).includes("inputTokens"), false);

  const rejected = createAgentSecurityEvent({
    event: "shop_agent_tool_rejected", reason: "unknown_tool", tool: undefined,
    step: 2, providerAttempts: 1, toolCalls: 0,
  }, correlationId);
  assert.deepEqual(Object.keys(rejected).sort(), ["correlationId", "event", "kind", "operation", "outcome", "providerAttempts", "reason", "step", "tool", "toolCalls"]);
  assert.equal(rejected.kind, "tool_rejected");
  assert.equal(rejected.tool, "unknown");

  const finished = createAgentSecurityEvent({
    event: "shop_agent_run", runId: "private-run-id", status: "completed", stopReason: "completed",
    steps: 999, toolCalls: 999, providerAttempts: 999, elapsedMs: 999_999, stepLog: [],
  }, correlationId);
  assert.equal(finished.kind, "agent_run_finished");
  assert.equal(finished.steps, 5);
  assert.equal(finished.toolCalls, 4);
  assert.equal(finished.providerAttempts, 8);
  assert.equal(finished.elapsedMs, 45_000);
  assert.equal(JSON.stringify(finished).includes("private-run-id"), false);
});

test("security sink failures are non-interfering", () => {
  assert.doesNotThrow(() => emitSecurityEvent(() => { throw new Error("sink failed"); }, createSecurityEvent({ operation: "unknown", reason: "invalid_json", status: 400 })));
});

test("safe admission event reasons preserve anonymous-session and process-capacity distinctions", () => {
  const sessionLimit = createSecurityEvent({ operation: "bootstrap", reason: "session_capacity_exhausted", status: 503 });
  const agentLimit = createSecurityEvent({ operation: "shop_agent", reason: "agent_capacity_exhausted", status: 503 });
  assert.equal(sessionLimit.reason, "session_capacity_exhausted");
  assert.equal(agentLimit.reason, "agent_capacity_exhausted");
  assert.equal(sessionLimit.providerAttempts, null);
  assert.equal(agentLimit.toolCalls, null);
});
