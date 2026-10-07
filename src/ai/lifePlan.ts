export type LifePlanStrategy = "save_for_life" | "buy_extra_xp_then_save";
export type LifePlanStatus = "completed" | "incomplete" | "unavailable" | "stale" | "cancelled";
export type LifePlanContext = {
  xp: number;
  level: number;
  perkPoints: number;
  extraXp: { level: number; nextCost: number | null; xpPerRedFood: number };
  extraLife: { charges: 0 | 1 | 2; nextCost: 5 | 8 | null };
};
export type PlanEvaluation = {
  evidenceId: string;
  strategy: LifePlanStrategy;
  foodLimit: 100;
  purchaseCostNow: number;
  pointsAfterPurchase: number;
  xpPerRedFood: number;
  projectedXp: number;
  projectedLevel: number;
  projectedPoints: number;
  assumptions: readonly ["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"];
  status: "reached";
  foodsToGoal: number;
} | {
  evidenceId: string;
  strategy: LifePlanStrategy;
  foodLimit: 100;
  purchaseCostNow: number;
  pointsAfterPurchase: number;
  xpPerRedFood: number;
  projectedXp: number;
  projectedLevel: number;
  projectedPoints: number;
  assumptions: readonly ["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"];
  status: "not_reached_within_limit";
} | {
  evidenceId: string;
  strategy: "buy_extra_xp_then_save";
  status: "unavailable";
  reasonCode: "extra_xp_capped" | "insufficient_points";
  foodLimit: 100;
};
export type LifePlanResult =
  | { status: "completed"; revision: number; source: "application" | "validated_plan"; recommendation: LifePlanStrategy | "buy_now"; reasonCode: string; evidenceIds: string[]; comparison?: Array<{ evidenceId: string; strategy: LifePlanStrategy; status: "reached" | "not_reached_within_limit"; foodsToGoal?: number; projectedPoints: number }>; assumptions: string[]; message: string }
  | { status: "incomplete"; revision: number; reasonCode: "none_reached"; comparison: PlanEvaluation[]; assumptions: string[]; message: string }
  | { status: "unavailable" | "stale" | "cancelled"; revision: number; code: string; message: string };

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function safeInt(value: unknown, min = 0): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min;
}

const PUBLIC_ASSUMPTIONS = ["RED FOOD ONLY", "NO COLLISIONS OR LIFE LOSS", "NO FUTURE LUCKY REWARDS", "NO OTHER PURCHASES", "A BOUNDED PROJECTION OF UP TO 100 FOODS; NOT A GUARANTEE."];
function validatePublicAssumptions(value: unknown): value is string[] {
  return Array.isArray(value) && JSON.stringify(value) === JSON.stringify(PUBLIC_ASSUMPTIONS);
}

function validatePublicEvaluation(value: unknown): value is PlanEvaluation {
  if (!record(value) || typeof value.status !== "string") return false;
  if (value.status === "unavailable") {
    return exact(value, ["evidenceId", "strategy", "status", "reasonCode", "foodLimit"])
      && typeof value.evidenceId === "string" && value.evidenceId.length > 0
      && value.strategy === "buy_extra_xp_then_save"
      && (value.reasonCode === "extra_xp_capped" || value.reasonCode === "insufficient_points") && value.foodLimit === 100;
  }
  const common = ["evidenceId", "strategy", "foodLimit", "purchaseCostNow", "pointsAfterPurchase", "xpPerRedFood", "projectedXp", "projectedLevel", "projectedPoints", "assumptions", "status"];
  if (typeof value.evidenceId !== "string" || value.evidenceId.length === 0
    || !["save_for_life", "buy_extra_xp_then_save"].includes(String(value.strategy)) || value.foodLimit !== 100
    || !safeInt(value.purchaseCostNow) || !safeInt(value.pointsAfterPurchase) || !safeInt(value.xpPerRedFood, 1)
    || !safeInt(value.projectedXp) || !safeInt(value.projectedLevel, 1) || !safeInt(value.projectedPoints)
    || !Array.isArray(value.assumptions) || value.assumptions.length !== 4
    || JSON.stringify(value.assumptions) !== JSON.stringify(["red_food_only", "no_collisions", "no_lucky", "no_other_purchases"])) return false;
  if (value.status === "reached") return exact(value, [...common, "foodsToGoal"]) && safeInt(value.foodsToGoal, 1) && value.foodsToGoal <= 100;
  return value.status === "not_reached_within_limit" && exact(value, common);
}

export function validateLifePlanResult(value: unknown): LifePlanResult | null {
  if (!record(value) || typeof value.status !== "string") return null;
  if (value.status === "completed") {
    if (!exact(value, ["status", "revision", "source", "recommendation", "reasonCode", "evidenceIds", "assumptions", "message"])
      && !exact(value, ["status", "revision", "source", "recommendation", "reasonCode", "evidenceIds", "comparison", "assumptions", "message"])) return null;
    if (!safeInt(value.revision) || (value.source !== "application" && value.source !== "validated_plan")
      || !["save_for_life", "buy_extra_xp_then_save", "buy_now"].includes(String(value.recommendation))
      || typeof value.reasonCode !== "string" || !Array.isArray(value.evidenceIds) || !value.evidenceIds.every((id) => typeof id === "string")
      || !Array.isArray(value.assumptions) || (value.source === "validated_plan" && !validatePublicAssumptions(value.assumptions))
      || typeof value.message !== "string" || value.message.length > 500) return null;
    if (value.source === "application") {
      if (value.recommendation !== "buy_now" || value.reasonCode !== "already_affordable" || value.evidenceIds.length !== 0
        || Object.hasOwn(value, "comparison") || value.assumptions.length !== 0) return null;
      return value as unknown as LifePlanResult;
    }
    if (value.recommendation === "buy_now" || !["fewer_food", "tie_save", "only_save_reached", "only_extra_xp_reached", "extra_xp_unavailable"].includes(value.reasonCode)
      || !Object.hasOwn(value, "comparison") || value.evidenceIds.length < 1 || value.evidenceIds.length > 2
      || new Set(value.evidenceIds).size !== value.evidenceIds.length) return null;
    if (Object.hasOwn(value, "comparison")) {
      if (!Array.isArray(value.comparison) || value.comparison.length < 1 || value.comparison.length > 2) return null;
      const strategies = new Set<string>();
      for (const entry of value.comparison) {
        if (!record(entry) || typeof entry.evidenceId !== "string" || entry.evidenceId.length === 0
          || !["save_for_life", "buy_extra_xp_then_save"].includes(String(entry.strategy))
          || strategies.has(String(entry.strategy)) || !["reached", "not_reached_within_limit"].includes(String(entry.status))
          || !safeInt(entry.projectedPoints)) return null;
        strategies.add(String(entry.strategy));
        if (entry.status === "reached") {
          if (!exact(entry, ["evidenceId", "strategy", "status", "foodsToGoal", "projectedPoints"]) || !safeInt(entry.foodsToGoal, 1) || entry.foodsToGoal > 100) return null;
        } else if (!exact(entry, ["evidenceId", "strategy", "status", "projectedPoints"])) return null;
      }
      const comparisonIds = value.comparison.map((entry) => (entry as Record<string, unknown>).evidenceId).sort();
      if (JSON.stringify(comparisonIds) !== JSON.stringify([...value.evidenceIds].sort())) return null;
    }
    return value as unknown as LifePlanResult;
  }
  if (value.status === "incomplete") {
    if (!exact(value, ["status", "revision", "reasonCode", "comparison", "assumptions", "message"]) || !safeInt(value.revision)
      || value.reasonCode !== "none_reached" || !Array.isArray(value.comparison) || value.comparison.length < 1 || value.comparison.length > 2
      || !value.comparison.every((item) => validatePublicEvaluation(item))
      || !validatePublicAssumptions(value.assumptions) || typeof value.message !== "string" || value.message.length > 500) return null;
    return value as unknown as LifePlanResult;
  }
  if (["unavailable", "stale", "cancelled"].includes(value.status)) {
    if (!exact(value, ["status", "revision", "code", "message"]) || !safeInt(value.revision)
      || typeof value.code !== "string" || value.code.length > 60 || typeof value.message !== "string" || value.message.length > 200) return null;
    return value as unknown as LifePlanResult;
  }
  return null;
}

export function comparePlanEvaluations(evaluations: PlanEvaluation[]): { recommendation: LifePlanStrategy | null; reasonCode: string } {
  const reached = evaluations.filter((item): item is Extract<PlanEvaluation, { status: "reached" }> => item.status === "reached");
  if (reached.length === 0) return { recommendation: null, reasonCode: "none_reached" };
  if (reached.length === 1) return { recommendation: reached[0].strategy, reasonCode: reached[0].strategy === "save_for_life" ? "only_save_reached" : "only_extra_xp_reached" };
  const [save, extra] = reached;
  if (save.foodsToGoal <= extra.foodsToGoal) return { recommendation: "save_for_life", reasonCode: save.foodsToGoal === extra.foodsToGoal ? "tie_save" : "fewer_food" };
  return { recommendation: "buy_extra_xp_then_save", reasonCode: "fewer_food" };
}
