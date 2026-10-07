export const AGENT_GOAL = "plan_next_purchases" as const;
export const PERKS = ["extra_xp", "luck", "extra_life"] as const;
export type Perk = typeof PERKS[number];
export const TOOL_NAMES = ["get_shop_state", "evaluate_perk_plan", "get_recent_runs"] as const;
export type ToolName = typeof TOOL_NAMES[number];
export const STOP_REASONS = [
  "completed", "invalid_model_proposal", "unknown_tool", "invalid_tool_arguments", "tool_failed",
  "provider_failed", "step_limit", "tool_call_limit", "deadline", "repeated_action", "cancelled", "stale",
] as const;
export type StopReason = typeof STOP_REASONS[number];
export type AgentRunStatus = "completed" | "stopped" | "failed";

export const MAX_PLAN_LENGTH = 3;
export const MAX_EVIDENCE = 4;
export const MAX_SUMMARY_CHARS = 200;
export const MAX_FINDING_CHARS = 160;

export type AgentEvidence = { source: ToolName; step: number; finding: string };
export type AgentResult = {
  summary: string;
  plan: Perk[];
  evidence: AgentEvidence[];
  confidence: "low" | "medium" | "high";
  completed: boolean;
};

export type PublicAgentRun =
  | { runId: string; status: "completed"; revision: number; steps: number; toolCalls: number; result: AgentResult; message: string }
  | { runId: string; status: "stopped" | "failed"; revision: number; steps: number; toolCalls: number; stopReason: StopReason; message: string };

export function isPerk(value: unknown): value is Perk {
  return PERKS.includes(value as Perk);
}

export function isToolName(value: unknown): value is ToolName {
  return TOOL_NAMES.includes(value as ToolName);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function plainText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
}

function validateAgentResultShape(value: unknown): AgentResult | null {
  if (!isRecord(value) || !exactKeys(value, ["summary", "plan", "evidence", "confidence", "completed"])) return null;
  const { summary, plan, evidence, confidence, completed } = value;
  if (!plainText(summary, MAX_SUMMARY_CHARS) || completed !== true) return null;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") return null;
  if (!Array.isArray(plan) || plan.length > MAX_PLAN_LENGTH || !plan.every(isPerk)) return null;
  if (!Array.isArray(evidence) || evidence.length < 1 || evidence.length > MAX_EVIDENCE) return null;
  const items: AgentEvidence[] = [];
  for (const item of evidence) {
    if (!isRecord(item) || !exactKeys(item, ["source", "step", "finding"])) return null;
    if (!isToolName(item.source) || typeof item.step !== "number" || !Number.isSafeInteger(item.step) || item.step < 1
      || !plainText(item.finding, MAX_FINDING_CHARS)) return null;
    items.push({ source: item.source, step: item.step, finding: item.finding });
  }
  return { summary, plan: [...plan], evidence: items, confidence, completed: true };
}

export function validatePublicAgentRun(value: unknown): PublicAgentRun | null {
  if (!isRecord(value) || typeof value.runId !== "string" || value.runId.length < 1 || value.runId.length > 64) return null;
  if (typeof value.revision !== "number" || !Number.isSafeInteger(value.revision) || value.revision < 0) return null;
  if (typeof value.steps !== "number" || !Number.isSafeInteger(value.steps) || value.steps < 0
    || typeof value.toolCalls !== "number" || !Number.isSafeInteger(value.toolCalls) || value.toolCalls < 0) return null;
  if (!plainText(value.message, 200)) return null;
  const base = { runId: value.runId, revision: value.revision, steps: value.steps, toolCalls: value.toolCalls, message: value.message };
  if (value.status === "completed") {
    if (!exactKeys(value, ["runId", "status", "revision", "steps", "toolCalls", "result", "message"])) return null;
    const result = validateAgentResultShape(value.result);
    return result ? { ...base, status: "completed", result } : null;
  }
  if (value.status === "stopped" || value.status === "failed") {
    if (!exactKeys(value, ["runId", "status", "revision", "steps", "toolCalls", "stopReason", "message"])) return null;
    const reason = value.stopReason;
    if (!STOP_REASONS.includes(reason as StopReason) || reason === "completed") return null;
    return { ...base, status: value.status, stopReason: reason as StopReason };
  }
  return null;
}
