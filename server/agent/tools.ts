import { isPerk, MAX_PLAN_LENGTH, TOOL_NAMES, isToolName, type Perk, type ToolName } from "../../src/ai/shopAgent.ts";
import { deriveShopContext } from "../ai/shopAdvice.ts";
import { evaluatePerkPlan } from "./perkRules.ts";
import type { ToolContext, ToolDefinition, ToolDescriptor, ToolRegistry } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isInt(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
}

function isCost(value: unknown, max: number): boolean {
  return value === null || isInt(value, 1, max);
}

function isPerkEntry(value: unknown, levelKey: "level" | "charges", maxLevel: number, maxCost: number): boolean {
  return isRecord(value) && exactKeys(value, [levelKey, "nextCost"]) && isInt(value[levelKey], 0, maxLevel) && isCost(value.nextCost, maxCost);
}

function isShopState(value: unknown): boolean {
  return isRecord(value)
    && exactKeys(value, ["stateVersion", "score", "xp", "level", "perkPoints", "extraXp", "luck", "extraLife"])
    && isInt(value.stateVersion, 0) && isInt(value.score, 0) && isInt(value.xp, 0)
    && isInt(value.level, 1) && isInt(value.perkPoints, 0)
    && isPerkEntry(value.extraXp, "level", 5, 5) && isPerkEntry(value.luck, "level", 5, 5)
    && isPerkEntry(value.extraLife, "charges", 2, 8);
}

function isEvaluation(value: unknown): boolean {
  if (!isRecord(value) || !exactKeys(value, ["stateVersion", "valid", "steps", "totalCost", "pointsLeft", "failures", "effects"])) return false;
  if (!isInt(value.stateVersion, 0) || typeof value.valid !== "boolean" || !isInt(value.totalCost, 0) || !isInt(value.pointsLeft, 0)) return false;
  if (!Array.isArray(value.steps) || value.steps.length < 1 || value.steps.length > MAX_PLAN_LENGTH) return false;
  const stepsOk = value.steps.every((step: unknown) => isRecord(step)
    && exactKeys(step, ["perk", "cost", "affordable", "capped", "pointsAfter"])
    && isPerk(step.perk) && isCost(step.cost, 8) && typeof step.affordable === "boolean"
    && typeof step.capped === "boolean" && isInt(step.pointsAfter, 0));
  if (!stepsOk) return false;
  if (!Array.isArray(value.failures) || !value.failures.every((code: unknown) => code === "unaffordable" || code === "capped")) return false;
  return Array.isArray(value.effects) && value.effects.length <= MAX_PLAN_LENGTH
    && value.effects.every((effect: unknown) => isRecord(effect) && exactKeys(effect, ["perk", "text"])
      && isPerk(effect.perk) && typeof effect.text === "string" && effect.text.length <= 120);
}

function isRunEntry(value: unknown): boolean {
  return isRecord(value) && exactKeys(value, ["score", "level", "perksAtEnd", "endedBy"])
    && isInt(value.score, 0) && isInt(value.level, 1)
    && isRecord(value.perksAtEnd) && exactKeys(value.perksAtEnd, ["extraXp", "luck", "extraLife"])
    && isInt(value.perksAtEnd.extraXp, 0, 5) && isInt(value.perksAtEnd.luck, 0, 5) && isInt(value.perksAtEnd.extraLife, 0, 2)
    && (value.endedBy === "game_over" || value.endedBy === "won" || value.endedBy === "restart");
}

function requireContext(context: ToolContext) {
  const shop = deriveShopContext(context.snapshot);
  if (!shop) throw new Error("not_available");
  return shop;
}

const getShopState: ToolDefinition = {
  name: "get_shop_state",
  descriptor: {
    name: "get_shop_state",
    description: "Read the current paused shop state: score, XP, level, unspent perk points, perk levels and next prices.",
    arguments: "{}",
  },
  validateArgs: (value) => (isRecord(value) && Object.keys(value).length === 0 ? { ok: true, value: {} } : { ok: false }),
  execute: (_args, context) => {
    const shop = requireContext(context);
    return {
      stateVersion: shop.revision,
      score: shop.score,
      xp: shop.xp,
      level: shop.level,
      perkPoints: shop.perkPoints,
      extraXp: { level: shop.extraXp.level, nextCost: shop.extraXp.nextCost },
      luck: { level: shop.luck.level, nextCost: shop.luck.nextCost },
      extraLife: { charges: shop.extraLife.charges, nextCost: shop.extraLife.nextCost },
    };
  },
  validateResult: isShopState,
};

const evaluatePerkPlanTool: ToolDefinition = {
  name: "evaluate_perk_plan",
  descriptor: {
    name: "evaluate_perk_plan",
    description: "Check, without buying anything, a sequence of 1 to 3 perks against the current unspent points. Perks: extra_xp, luck, extra_life.",
    arguments: '{"plan":["extra_xp","luck"]}',
  },
  validateArgs: (value) => {
    if (!isRecord(value) || !exactKeys(value, ["plan"])) return { ok: false };
    const plan = value.plan;
    if (!Array.isArray(plan) || plan.length < 1 || plan.length > MAX_PLAN_LENGTH || !plan.every(isPerk)) return { ok: false };
    return { ok: true, value: { plan: [...plan] } };
  },
  execute: (args, context) => {
    const shop = requireContext(context);
    const evaluation = evaluatePerkPlan(args.plan as Perk[], shop.perkPoints, {
      extraXpLevel: shop.extraXp.level,
      luckLevel: shop.luck.level,
      extraLives: shop.extraLife.charges,
    });
    return { stateVersion: shop.revision, ...evaluation };
  },
  validateResult: isEvaluation,
};

const getRecentRuns: ToolDefinition = {
  name: "get_recent_runs",
  descriptor: {
    name: "get_recent_runs",
    description: "Read summaries of up to 5 recently finished games of this game container, newest first. The list may be empty.",
    arguments: '{"limit":3}',
  },
  validateArgs: (value) => (isRecord(value) && exactKeys(value, ["limit"]) && isInt(value.limit, 1, 5)
    ? { ok: true, value: { limit: value.limit } }
    : { ok: false }),
  execute: (args, context) => ({
    runs: context.history.slice(0, args.limit as number).map((run) => ({
      score: run.score,
      level: run.level,
      perksAtEnd: { ...run.perksAtEnd },
      endedBy: run.endedBy,
    })),
  }),
  validateResult: (value) => isRecord(value) && exactKeys(value, ["runs"])
    && Array.isArray(value.runs) && value.runs.length <= 5 && value.runs.every(isRunEntry),
};

export const TOOLS: ToolRegistry = {
  get_shop_state: getShopState,
  evaluate_perk_plan: evaluatePerkPlanTool,
  get_recent_runs: getRecentRuns,
};

export function lookupTool(name: unknown, registry: ToolRegistry = TOOLS): ToolDefinition | null {
  return isToolName(name) ? registry[name] : null;
}

export function toolDescriptors(registry: ToolRegistry = TOOLS): ToolDescriptor[] {
  return TOOL_NAMES.map((name: ToolName) => registry[name].descriptor);
}
