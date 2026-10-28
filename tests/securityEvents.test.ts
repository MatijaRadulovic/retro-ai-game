import test from "node:test";
import assert from "node:assert/strict";
import { createSecurityEvent, emitSecurityEvent } from "../server/security/securityEvents.ts";

test("security event has an exact bounded schema and drops attacker-controlled values", () => {
  const event = createSecurityEvent({
    operation: "shop_agent", reason: "request_forbidden\nW08_SERVER_SECRET_DO_NOT_EXPOSE", status: 403,
    correlationId: "../../game?secret=sentinel",
  });
  assert.deepEqual(Object.keys(event).sort(), ["correlationId", "event", "operation", "reason", "status"]);
  assert.equal(event.event, "w08_request_denied");
  assert.equal(event.operation, "shop_agent");
  assert.equal(event.reason, "request_rejected");
  assert.equal(event.status, 403);
  assert.match(event.correlationId, /^[0-9a-f-]{36}$/i);
  assert.equal(JSON.stringify(event).includes("W08_SERVER_SECRET"), false);
  assert.equal(JSON.stringify(event).includes("secret=sentinel"), false);
});

test("security sink failures are non-interfering", () => {
  assert.doesNotThrow(() => emitSecurityEvent(() => { throw new Error("sink failed"); }, createSecurityEvent({ operation: "unknown", reason: "invalid_json", status: 400 })));
});
