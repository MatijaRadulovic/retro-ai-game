import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePerkPlan, nextPerkCost } from "../server/agent/perkRules.ts";

const fresh = { extraXpLevel: 0, luckLevel: 0, extraLives: 0 };

test("next perk cost follows the engine price tables and caps", () => {
  assert.equal(nextPerkCost("extra_xp", fresh), 1);
  assert.equal(nextPerkCost("extra_xp", { ...fresh, extraXpLevel: 4 }), 5);
  assert.equal(nextPerkCost("extra_xp", { ...fresh, extraXpLevel: 5 }), null);
  assert.equal(nextPerkCost("luck", { ...fresh, luckLevel: 2 }), 3);
  assert.equal(nextPerkCost("extra_life", fresh), 5);
  assert.equal(nextPerkCost("extra_life", { ...fresh, extraLives: 1 }), 8);
  assert.equal(nextPerkCost("extra_life", { ...fresh, extraLives: 2 }), null);
});

test("an affordable sequence is valid and tracks the remaining points", () => {
  const result = evaluatePerkPlan(["extra_xp", "extra_xp"], 3, fresh);
  assert.equal(result.valid, true);
  assert.deepEqual(result.steps, [
    { perk: "extra_xp", cost: 1, affordable: true, capped: false, pointsAfter: 2 },
    { perk: "extra_xp", cost: 2, affordable: true, capped: false, pointsAfter: 0 },
  ]);
  assert.equal(result.totalCost, 3);
  assert.equal(result.pointsLeft, 0);
  assert.deepEqual(result.failures, []);
  assert.deepEqual(result.effects.map((effect) => effect.text), [
    "EXTRA XP LEVEL 1: EACH FOOD NOW GIVES 12 XP.",
    "EXTRA XP LEVEL 2: EACH FOOD NOW GIVES 14 XP.",
  ]);
});

test("an unaffordable step is reported and nothing is bought for it", () => {
  const result = evaluatePerkPlan(["extra_life"], 4, fresh);
  assert.equal(result.valid, false);
  assert.deepEqual(result.steps[0], { perk: "extra_life", cost: 5, affordable: false, capped: false, pointsAfter: 4 });
  assert.deepEqual(result.failures, ["unaffordable"]);
  assert.equal(result.totalCost, 0);
  assert.equal(result.pointsLeft, 4);
  assert.deepEqual(result.effects, []);
});

test("a capped perk is reported as capped with no cost", () => {
  const result = evaluatePerkPlan(["extra_xp"], 9, { ...fresh, extraXpLevel: 5 });
  assert.equal(result.valid, false);
  assert.deepEqual(result.steps[0], { perk: "extra_xp", cost: null, affordable: false, capped: true, pointsAfter: 9 });
  assert.deepEqual(result.failures, ["capped"]);
});

test("steps after a failure are judged on the unchanged balance", () => {
  const result = evaluatePerkPlan(["extra_life", "luck"], 5, fresh);
  assert.equal(result.steps[0].affordable, true);
  assert.equal(result.steps[1].affordable, false);
  assert.deepEqual(result.failures, ["unaffordable"]);
  assert.equal(result.totalCost, 5);
  assert.equal(result.pointsLeft, 0);
  assert.equal(result.valid, false);
});

test("evaluation does not mutate the supplied levels", () => {
  const levels = { extraXpLevel: 0, luckLevel: 0, extraLives: 0 };
  evaluatePerkPlan(["extra_xp", "luck", "extra_life"], 20, levels);
  assert.deepEqual(levels, { extraXpLevel: 0, luckLevel: 0, extraLives: 0 });
});
