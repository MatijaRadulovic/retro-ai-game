export const ADVICE_MODELS = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it"] as const;
export type AdviceModel = typeof ADVICE_MODELS[number];
export type AdviceDecision = "buy_extra_xp" | "buy_luck" | "buy_extra_life" | "wait";
export type AdviceReason = "faster_xp" | "more_lucky" | "collision_protection" | "save_points" | "cannot_afford" | "all_capped";
export type AdviceUnavailableCode = "not_configured" | "busy" | "cancelled" | "stale" | "invalid_provider_output" | "temporarily_unavailable";

export type ShopAdviceResult =
  | {
    status: "advice";
    revision: number;
    decision: AdviceDecision;
    reasonCode: AdviceReason;
    message: string;
    model: AdviceModel;
  }
  | {
    status: "unavailable";
    revision: number;
    code: AdviceUnavailableCode;
    message: string;
  };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

export function isAdviceDecision(value: unknown): value is AdviceDecision {
  return value === "buy_extra_xp" || value === "buy_luck" || value === "buy_extra_life" || value === "wait";
}

export function isAdviceReason(value: unknown): value is AdviceReason {
  return value === "faster_xp" || value === "more_lucky" || value === "collision_protection"
    || value === "save_points" || value === "cannot_afford" || value === "all_capped";
}

export function isDecisionReasonPair(decision: AdviceDecision, reason: AdviceReason): boolean {
  return decision === "buy_extra_xp" ? reason === "faster_xp"
    : decision === "buy_luck" ? reason === "more_lucky"
      : decision === "buy_extra_life" ? reason === "collision_protection"
        : reason === "save_points" || reason === "cannot_afford" || reason === "all_capped";
}

export function validateShopAdviceResult(value: unknown): ShopAdviceResult | null {
  if (!isRecord(value) || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0) return null;
  if (value.status === "advice") {
    if (!exactKeys(value, ["status", "revision", "decision", "reasonCode", "message", "model"])) return null;
    if (!isAdviceDecision(value.decision) || !isAdviceReason(value.reasonCode)
      || !ADVICE_MODELS.includes(value.model as AdviceModel)
      || typeof value.message !== "string" || value.message.trim().length < 4 || value.message.length > 180) return null;
    if (!isDecisionReasonPair(value.decision, value.reasonCode)) return null;
    return value as ShopAdviceResult;
  }
  if (value.status === "unavailable") {
    if (!exactKeys(value, ["status", "revision", "code", "message"])) return null;
    if (value.code !== "not_configured" && value.code !== "busy" && value.code !== "cancelled"
      && value.code !== "stale" && value.code !== "invalid_provider_output" && value.code !== "temporarily_unavailable") return null;
    if (typeof value.message !== "string" || value.message.trim().length < 4 || value.message.length > 180) return null;
    return value as ShopAdviceResult;
  }
  return null;
}
