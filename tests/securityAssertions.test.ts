import test from "node:test";
import assert from "node:assert/strict";
import { assertNoAgentSideEffects, assertProviderCalls } from "./helpers/securityAssertions.ts";
import { createRequestContext } from "../server/security/requestContext.ts";

test("shared assertions report provider and side-effect boundary violations", () => {
  assertProviderCalls(0, 0);
  assert.throws(() => assertProviderCalls(1, 0), /expected 0/);
  assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 0, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 2 } });
  assert.throws(() => assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 1, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 2 } }), /tool calls/);
  assert.throws(() => assertNoAgentSideEffects({ providerCalls: 0, toolCalls: 0, snapshotBefore: { revision: 2 }, snapshotAfter: { revision: 3 } }), /snapshot changed/);
});

test("request context contains only server-owned scope and allowlisted operation metadata", () => {
  const request = { method: "POST", url: "/api/games/game-1/shop-agent", headers: { origin: "http://localhost:5173", cookie: "secret", "x-retro-request": "verifier" } } as unknown as import("node:http").IncomingMessage;
  const context = createRequestContext(request, "internal-scope", 42);
  assert.equal(context.operation, "shop_agent");
  assert.equal(context.originClass, "allowed_browser");
  assert.equal(context.receivedAt, 42);
  assert.equal(context.scopeId, "internal-scope");
  assert.equal("cookie" in context, false);
  assert.equal("requestVerifier" in context, false);
  assert.equal(Object.isFrozen(context), true);
});
