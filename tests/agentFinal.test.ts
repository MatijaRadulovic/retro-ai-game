import test from "node:test";
import assert from "node:assert/strict";
import { buildPlanLine, validateAgentResult } from "../server/agent/finalResult.ts";
import type { TranscriptEntry } from "../server/agent/types.ts";
import type { Perk } from "../src/ai/shopAgent.ts";

const state = (perkPoints: number, costs: [number | null, number | null, number | null] = [1, 1, 5]) => ({
  stateVersion: 2, score: 0, xp: 0, level: 1, perkPoints,
  extraXp: { level: 0, nextCost: costs[0] }, luck: { level: 0, nextCost: costs[1] }, extraLife: { charges: 0, nextCost: costs[2] },
});
const evaluation = (valid: boolean) => ({
  stateVersion: 2, valid, steps: [], totalCost: 1, pointsLeft: 2, failures: valid ? [] : ["unaffordable"], effects: [],
});
const transcriptWith = (perkPoints = 3, costs?: [number | null, number | null, number | null]): TranscriptEntry[] => [
  { step: 1, tool: "get_shop_state", arguments: {}, result: state(perkPoints, costs) },
  { step: 2, tool: "evaluate_perk_plan", arguments: { plan: ["extra_xp"] }, result: evaluation(true) },
];
const validPlans: Perk[][] = [["extra_xp"]];
const good = {
  summary: "Buy Extra XP now.",
  plan: ["extra_xp"],
  evidence: [{ source: "get_shop_state", step: 1, finding: "3 points available." }],
  confidence: "medium",
  completed: true,
};
const check = (value: unknown, transcript = transcriptWith(), plans = validPlans) => validateAgentResult(value, transcript, plans);

test("a well-formed result backed by an evaluated plan is accepted", () => {
  assert.deepEqual(check(good), good);
});

test("exact keys, types and bounds are enforced", () => {
  assert.equal(check({ ...good, extra: 1 }), null);
  assert.equal(check({ ...good, summary: "" }), null);
  assert.equal(check({ ...good, summary: "x".repeat(201) }), null);
  assert.equal(check({ ...good, confidence: "certain" }), null);
  assert.equal(check({ ...good, plan: ["extra_xp", "luck", "luck", "luck"] }), null);
  assert.equal(check({ ...good, plan: ["buy_all"] }), null);
  assert.equal(check({ ...good, evidence: [] }), null);
  assert.equal(check({ ...good, evidence: Array(5).fill(good.evidence[0]) }), null);
  assert.equal(check({ ...good, evidence: [{ source: "get_shop_state", step: 1, finding: "x".repeat(161) }] }), null);
  assert.equal(check(null), null);
});

test("completed must be true", () => {
  assert.equal(check({ ...good, completed: false }), null);
  assert.equal(check({ ...good, completed: "yes" }), null);
});

test("evidence must cite a tool that really ran at that step", () => {
  assert.equal(check({ ...good, evidence: [{ source: "get_recent_runs", step: 1, finding: "ok" }] }), null);
  assert.equal(check({ ...good, evidence: [{ source: "get_shop_state", step: 2, finding: "ok" }] }), null);
  assert.equal(check({ ...good, evidence: [{ source: "get_shop_state", step: 9, finding: "ok" }] }), null);
  assert.equal(check({ ...good, evidence: [{ source: "delete_database", step: 1, finding: "ok" }] }), null);
});

test("a non-empty plan must equal a plan the evaluator accepted in this run", () => {
  assert.equal(check({ ...good, plan: ["luck"] }), null);
  assert.equal(check(good, transcriptWith(), []), null);
  assert.equal(check({ ...good, plan: ["extra_xp", "extra_xp"] }), null);
});

test("an empty plan needs shop state showing nothing is affordable or everything is capped", () => {
  const empty = { ...good, summary: "Save your points.", plan: [] };
  assert.notEqual(check(empty, transcriptWith(0, [1, 1, 5]), []), null);
  assert.notEqual(check(empty, transcriptWith(9, [null, null, null]), []), null);
  assert.equal(check(empty, transcriptWith(3, [1, 1, 5]), []), null);
  assert.equal(check(empty, [], []), null);
});

test("claims about past games need a non-empty history", () => {
  const withHistory = (runs: unknown[]): TranscriptEntry[] => [
    ...transcriptWith(0),
    { step: 3, tool: "get_recent_runs", arguments: { limit: 3 }, result: { runs } },
  ];
  const empty = { ...good, plan: [], evidence: [{ source: "get_recent_runs", step: 3, finding: "Past games ended early." }] };
  assert.equal(check(empty, withHistory([]), []), null);
  const run = { score: 10, level: 1, perksAtEnd: { extraXp: 0, luck: 0, extraLife: 0 }, endedBy: "game_over" };
  assert.notEqual(check(empty, withHistory([run]), []), null);
});

test("control characters are rejected; HTML-looking text passes validation and is rendered with textContent", () => {
  assert.equal(check({ ...good, summary: "bad\u0007text" }), null);
  assert.equal(check({ ...good, evidence: [{ source: "get_shop_state", step: 1, finding: "line\nbreak" }] }), null);
  assert.notEqual(check({ ...good, summary: "<img src=x onerror=alert(1)>" }), null);
});

test("plan line is built from the evaluated plan", () => {
  const transcript = transcriptWith();
  assert.equal(buildPlanLine(["extra_xp"], transcript), "PLAN: EXTRA XP · COST 1 PT · 2 PT LEFT.");
  assert.equal(buildPlanLine([], transcript), "PLAN: BUY NOTHING YET. SAVE YOUR POINTS.");
  assert.equal(buildPlanLine(["luck", "extra_life"], transcript), "PLAN: LUCK → +1 LIFE.");
});
