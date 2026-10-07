import test from "node:test";
import assert from "node:assert/strict";
import { GameSessionManager } from "../server/gameSession.ts";
import type { RunHistoryEntry } from "../server/gameSession.ts";
import { TOOLS, lookupTool, toolDescriptors } from "../server/agent/tools.ts";
import { TOOL_NAMES } from "../src/ai/shopAgent.ts";

function context(points = 3, history: RunHistoryEntry[] = []) {
  const manager = new GameSessionManager(() => 0, () => "tool-game");
  const game = manager.create();
  manager.move(game.id, "up");
  manager.pause(game.id);
  const snapshot = manager.get(game.id);
  snapshot.players[0].progression.perkPoints = points;
  return { snapshot, history };
}

const entry = (score: number): RunHistoryEntry => ({
  score, level: 2, perksAtEnd: { extraXp: 1, luck: 0, extraLife: 0 }, endedBy: "game_over",
});

test("lookup accepts only allowlisted names, never inherited keys", () => {
  for (const name of TOOL_NAMES) assert.equal(lookupTool(name)?.name, name);
  for (const bad of ["delete_database", "buy_perk", "constructor", "toString", "__proto__", "", 42, null, undefined]) {
    assert.equal(lookupTool(bad), null);
  }
  assert.deepEqual(toolDescriptors().map((descriptor) => descriptor.name), [...TOOL_NAMES]);
});

test("get_shop_state takes no arguments and returns the sanitized state", () => {
  const tool = TOOLS.get_shop_state;
  assert.deepEqual(tool.validateArgs({}), { ok: true, value: {} });
  for (const bad of [{ x: 1 }, null, [], "x", undefined]) assert.equal(tool.validateArgs(bad).ok, false);
  const result = tool.execute({}, context(3));
  assert.equal(tool.validateResult(result), true);
  assert.equal((result as { perkPoints: number }).perkPoints, 3);
  assert.equal("snake" in (result as object), false);
  assert.equal("id" in (result as object), false);
  assert.equal(tool.validateResult({ ...(result as object), extra: 1 }), false);
  assert.equal(tool.validateResult({ ...(result as object), perkPoints: "3" }), false);
});

test("evaluate_perk_plan validates a strict 1-3 item perk plan", () => {
  const tool = TOOLS.evaluate_perk_plan;
  assert.deepEqual(tool.validateArgs({ plan: ["extra_xp", "luck"] }), { ok: true, value: { plan: ["extra_xp", "luck"] } });
  const bad: unknown[] = [
    {}, { plan: [] }, { plan: ["buy_everything"] }, { plan: ["extra_xp", "extra_xp", "extra_xp", "extra_xp"] },
    { plan: "extra_xp" }, { plan: ["luck"], limit: 1 }, { plans: ["luck"] }, null,
    JSON.parse('{"plan":["luck"],"__proto__":{"x":1}}'),
  ];
  for (const value of bad) assert.equal(tool.validateArgs(value).ok, false);
});

test("evaluate_perk_plan executes deterministically on the snapshot without mutating it", () => {
  const tool = TOOLS.evaluate_perk_plan;
  const ctx = context(3);
  const before = JSON.stringify(ctx.snapshot);
  const result = tool.execute({ plan: ["extra_xp", "extra_xp"] }, ctx) as { valid: boolean; totalCost: number; pointsLeft: number };
  assert.equal(tool.validateResult(result), true);
  assert.equal(result.valid, true);
  assert.equal(result.totalCost, 3);
  assert.equal(result.pointsLeft, 0);
  assert.equal(JSON.stringify(ctx.snapshot), before);
  const poor = tool.execute({ plan: ["extra_life"] }, context(1)) as { valid: boolean; failures: string[] };
  assert.equal(poor.valid, false);
  assert.deepEqual(poor.failures, ["unaffordable"]);
  assert.equal(tool.validateResult({ ...result, failures: ["nope"] }), false);
});

test("get_recent_runs needs an integer limit 1..5 and returns newest first", () => {
  const tool = TOOLS.get_recent_runs;
  assert.deepEqual(tool.validateArgs({ limit: 2 }), { ok: true, value: { limit: 2 } });
  for (const bad of [{}, { limit: 0 }, { limit: 6 }, { limit: "2" }, { limit: 1.5 }, { limit: 1, x: 1 }, null]) {
    assert.equal(tool.validateArgs(bad).ok, false);
  }
  const ctx = context(0, [entry(30), entry(20), entry(10)]);
  const result = tool.execute({ limit: 2 }, ctx) as { runs: RunHistoryEntry[] };
  assert.deepEqual(result.runs.map((run) => run.score), [30, 20]);
  assert.equal(tool.validateResult(result), true);
  assert.deepEqual(tool.execute({ limit: 3 }, context(0, [])), { runs: [] });
  assert.equal(tool.validateResult({ runs: [{ score: 1 }] }), false);
});
