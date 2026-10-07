import type { Perk } from "../../src/ai/shopAgent.ts";
import { getLuckySpawnChance } from "../../src/game/snakeEngine.ts";

export type PerkLevels = { extraXpLevel: number; luckLevel: number; extraLives: number };
export type PlanStep = { perk: Perk; cost: number | null; affordable: boolean; capped: boolean; pointsAfter: number };
export type PlanEvaluation = {
  valid: boolean;
  steps: PlanStep[];
  totalCost: number;
  pointsLeft: number;
  failures: Array<"unaffordable" | "capped">;
  effects: Array<{ perk: Perk; text: string }>;
};

export function nextPerkCost(perk: Perk, levels: PerkLevels): number | null {
  if (perk === "extra_xp") return levels.extraXpLevel >= 5 ? null : levels.extraXpLevel + 1;
  if (perk === "luck") return levels.luckLevel >= 5 ? null : levels.luckLevel + 1;
  return levels.extraLives >= 2 ? null : levels.extraLives === 0 ? 5 : 8;
}

export function evaluatePerkPlan(plan: Perk[], points: number, levels: PerkLevels): PlanEvaluation {
  const state = { ...levels };
  let balance = points;
  let totalCost = 0;
  const steps: PlanStep[] = [];
  const failures: Array<"unaffordable" | "capped"> = [];
  const effects: Array<{ perk: Perk; text: string }> = [];
  const fail = (code: "unaffordable" | "capped") => { if (!failures.includes(code)) failures.push(code); };

  for (const perk of plan) {
    const cost = nextPerkCost(perk, state);
    if (cost === null) {
      fail("capped");
      steps.push({ perk, cost: null, affordable: false, capped: true, pointsAfter: balance });
      continue;
    }
    if (balance < cost) {
      fail("unaffordable");
      steps.push({ perk, cost, affordable: false, capped: false, pointsAfter: balance });
      continue;
    }
    balance -= cost;
    totalCost += cost;
    if (perk === "extra_xp") {
      state.extraXpLevel += 1;
      effects.push({ perk, text: `EXTRA XP LEVEL ${state.extraXpLevel}: EACH FOOD NOW GIVES ${10 + 2 * state.extraXpLevel} XP.` });
    } else if (perk === "luck") {
      state.luckLevel += 1;
      effects.push({ perk, text: `LUCK LEVEL ${state.luckLevel}: ${Math.round(getLuckySpawnChance(state.luckLevel) * 100)}% LUCKY PICKUP CHANCE.` });
    } else {
      state.extraLives += 1;
      effects.push({ perk, text: `+1 LIFE: ${state.extraLives} CHARGE${state.extraLives === 1 ? "" : "S"} HELD.` });
    }
    steps.push({ perk, cost, affordable: true, capped: false, pointsAfter: balance });
  }
  return { valid: failures.length === 0, steps, totalCost, pointsLeft: balance, failures, effects };
}
