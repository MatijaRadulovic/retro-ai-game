import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createGameHttpServer } from "../server/httpServer.ts";
import { createShopAdvisor } from "../server/ai/shopAdvice.ts";
import { createShopAgent } from "../server/agent/shopAgent.ts";
import type { AgentTransport } from "../server/agent/types.ts";
import { FAST, SHOP_STATE, evalPlan, finalAnswer, pausedGame, scripted, validResult } from "./support/agentFixtures.ts";

async function start(transport: AgentTransport | null, points = 3) {
  const { manager, id } = pausedGame(points);
  const server = createGameHttpServer(manager, createShopAdvisor(null), createShopAgent(transport, { deps: FAST }));
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return {
    manager,
    id,
    url: `http://127.0.0.1:${address.port}/api/games/${id}/shop-agent`,
    base: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

const post = (url: string, body: unknown, signal?: AbortSignal) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
const GOAL = { goal: "plan_next_purchases" };
const plan = ["extra_xp"];
const happy = () => [
  SHOP_STATE,
  evalPlan(plan),
  finalAnswer(validResult({ plan, evidence: [{ source: "evaluate_perk_plan", step: 2, finding: "Extra XP is affordable." }] })),
];

test("a successful run returns the safe public shape and changes nothing", async () => {
  const script = scripted(happy());
  const app = await start(script.transport);
  try {
    const before = app.manager.get(app.id).revision;
    const response = await post(app.url, GOAL);
    assert.equal(response.status, 200);
    const { run } = await response.json() as { run: Record<string, unknown> };
    assert.deepEqual(Object.keys(run).sort(), ["message", "result", "revision", "runId", "status", "steps", "toolCalls"]);
    assert.equal(run.status, "completed");
    assert.equal(run.steps, 3);
    assert.equal(run.toolCalls, 2);
    assert.equal(run.message, "PLAN: EXTRA XP · COST 1 PT · 2 PT LEFT.");
    assert.equal(app.manager.get(app.id).revision, before);
    assert.equal(JSON.stringify(run).includes("fixture-1"), false);
  } finally { await app.close(); }
});

test("a stopped run exposes only a stop reason and a safe message", async () => {
  const app = await start(scripted([{ value: { kind: "tool_request", tool: "delete_database", arguments: {} } }]).transport);
  try {
    const { run } = await (await post(app.url, GOAL)).json() as { run: Record<string, unknown> };
    assert.equal(run.status, "stopped");
    assert.equal(run.stopReason, "unknown_tool");
    assert.equal("result" in run, false);
    assert.equal(run.message, "ANALYSIS COULD NOT BE COMPLETED SAFELY. NO PURCHASE WAS MADE.");
  } finally { await app.close(); }
});

test("E20 preflight rejects bad requests before any provider call", async () => {
  const script = scripted(happy());
  const app = await start(script.transport);
  try {
    assert.equal((await post(app.url, {})).status, 400);
    assert.equal((await post(app.url, { goal: "something else" })).status, 400);
    assert.equal((await post(app.url, { ...GOAL, model: "gemini-evil" })).status, 400);
    assert.equal((await post(`${app.base}/api/games/unknown/shop-agent`, GOAL)).status, 404);
    app.manager.resume(app.id);
    assert.equal((await post(app.url, GOAL)).status, 409);
    assert.equal(script.calls.length, 0);
  } finally { await app.close(); }
});

test("without a configured provider the run fails safely with no provider call", async () => {
  const app = await start(null);
  try {
    const { run } = await (await post(app.url, GOAL)).json() as { run: Record<string, unknown> };
    assert.equal(run.status, "failed");
    assert.equal(run.stopReason, "provider_failed");
    assert.equal(run.steps, 0);
  } finally { await app.close(); }
});

test("a second request while a run is active is busy and makes no second provider call", async () => {
  const script = scripted([{ hang: true }]);
  const app = await start(script.transport);
  const first = new AbortController();
  try {
    const pending = post(app.url, GOAL, first.signal).catch(() => null);
    for (let index = 0; index < 100 && script.calls.length === 0; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(script.calls.length, 1);
    const { run } = await (await post(app.url, GOAL)).json() as { run: Record<string, unknown> };
    assert.equal(run.status, "failed");
    assert.equal(run.steps, 0);
    assert.equal(script.calls.length, 1);
    first.abort();
    await pending;
    for (let index = 0; index < 100 && !script.seen.aborted; index += 1) await new Promise((resolve) => setTimeout(resolve, 5));
    assert.equal(script.seen.aborted, true);
  } finally { await app.close(); }
});
