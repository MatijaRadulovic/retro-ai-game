import { randomUUID } from "node:crypto";
import type { GameSnapshot } from "../../src/game/gameProtocol.ts";
import { getExtraLifePerkCost, getExtraXpPerkCost, getLevelForXp, getRedFoodXp } from "../../src/game/snakeEngine.ts";
import type { LifePlanContext, LifePlanStrategy, PlanEvaluation } from "../../src/ai/lifePlan.ts";

export function getLifePlanContext(snapshot: GameSnapshot): LifePlanContext | null {
  if (snapshot.state.status !== "paused" || snapshot.players.length !== 1) return null;
  const player = snapshot.players[0];
  const { xp, level, perkPoints } = player.progression;
  const { extraXp, extraLife } = player.perks;
  if (![xp, level, perkPoints, extraXp.level, extraLife.charges].every(Number.isSafeInteger)
    || xp < 0 || xp > 1_000_000 || level < 1 || perkPoints < 0 || extraXp.level < 0 || extraXp.level > 5 || extraLife.charges < 0 || extraLife.charges > 2
    || getLevelForXp(xp) !== level) return null;
  const nextLifeCost = getExtraLifePerkCost(extraLife.charges);
  const nextExtraXpCost = getExtraXpPerkCost(extraXp.level);
  if (extraLife.nextCost !== nextLifeCost || extraXp.nextCost !== nextExtraXpCost) return null;
  return { xp, level, perkPoints, extraXp: { level: extraXp.level, nextCost: extraXp.nextCost, xpPerRedFood: getRedFoodXp(extraXp.level) }, extraLife: { charges: extraLife.charges as 0 | 1 | 2, nextCost: nextLifeCost } };
}

export function evaluatePlan(context: LifePlanContext, strategy: LifePlanStrategy, id: () => string = randomUUID): PlanEvaluation {
  const startedAt = performance.now();
  const checkToolBudget = (result: PlanEvaluation): PlanEvaluation => {
    if (Buffer.byteLength(JSON.stringify(result), "utf8") > 8192) throw new Error("Tool result exceeded limit.");
    if (performance.now() - startedAt > 100) throw new Error("Tool execution exceeded local budget.");
    return result;
  };
  const cost = context.extraLife.nextCost;
  if (cost === null) throw new Error("No next life is available.");
  let purchaseCostNow = 0;
  let points = context.perkPoints;
  let xpPerFood = context.extraXp.xpPerRedFood;
  if (strategy === "buy_extra_xp_then_save") {
    if (context.extraXp.nextCost === null) return checkToolBudget({ evidenceId: id(), strategy, status: "unavailable", reasonCode: "extra_xp_capped", foodLimit: 100 });
    if (context.perkPoints < context.extraXp.nextCost) return checkToolBudget({ evidenceId: id(), strategy, status: "unavailable", reasonCode: "insufficient_points", foodLimit: 100 });
    purchaseCostNow = context.extraXp.nextCost;
    points -= purchaseCostNow;
    xpPerFood = getRedFoodXp(context.extraXp.level + 1);
  }
  let xp = context.xp;
  let level = context.level;
  let foodsToGoal: number | undefined;
  for (let food = 1; food <= 100; food += 1) {
    xp += xpPerFood;
    const newLevel = getLevelForXp(xp);
    points += newLevel - level;
    level = newLevel;
    if (points >= cost) { foodsToGoal = food; break; }
  }
  const base = { evidenceId: id(), strategy, foodLimit: 100 as const, purchaseCostNow, pointsAfterPurchase: context.perkPoints - purchaseCostNow, xpPerRedFood: xpPerFood, projectedXp: xp, projectedLevel: level, projectedPoints: points, assumptions: ["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"] as const };
  const result: PlanEvaluation = foodsToGoal === undefined ? { ...base, status: "not_reached_within_limit" } : { ...base, status: "reached", foodsToGoal };
  return checkToolBudget(result);
}

export function validatePlanEvaluation(value: unknown, context: LifePlanContext, expectedStrategy: LifePlanStrategy): value is PlanEvaluation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const evaluation = value as Partial<PlanEvaluation>;
  if (evaluation.strategy !== expectedStrategy || typeof evaluation.evidenceId !== "string" || evaluation.evidenceId.length < 1 || evaluation.evidenceId.length > 100) return false;
  const expected = evaluatePlan(context, expectedStrategy, () => evaluation.evidenceId!);
  return JSON.stringify({ ...evaluation, evidenceId: "" }) === JSON.stringify({ ...expected, evidenceId: "" });
}
