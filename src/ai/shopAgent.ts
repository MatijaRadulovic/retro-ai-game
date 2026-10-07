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
