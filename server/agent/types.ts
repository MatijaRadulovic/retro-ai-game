import type { AdviceModel } from "../../src/ai/shopAdvice.ts";
import type { AgentResult, AgentRunStatus, StopReason, ToolName } from "../../src/ai/shopAgent.ts";
import type { ProviderErrorClass, ProviderResponse, ProviderUsage } from "../ai/shopAdvice.ts";
import type { GameSnapshot, RunHistoryEntry } from "../gameSession.ts";

export type AgentLimits = {
  maxAgentSteps: number;
  maxToolCalls: number;
  maxEvaluatorCalls: number;
  maxAttemptsPerStep: number;
  maxProviderAttempts: number;
  maxProviderFallbacks: number;
  perCallTimeoutMs: number;
  totalDeadlineMs: number;
  toolTimeoutMs: number;
  maxToolResultBytes: number;
};

export const DEFAULT_LIMITS: AgentLimits = {
  maxAgentSteps: 5,
  maxToolCalls: 4,
  maxEvaluatorCalls: 2,
  maxAttemptsPerStep: 2,
  maxProviderAttempts: 8,
  maxProviderFallbacks: 2,
  perCallTimeoutMs: 10_000,
  totalDeadlineMs: 45_000,
  toolTimeoutMs: 200,
  maxToolResultBytes: 4_096,
};

export function statusForStop(reason: StopReason): AgentRunStatus {
  if (reason === "completed") return "completed";
  if (reason === "provider_failed" || reason === "tool_failed") return "failed";
  return "stopped";
}

export type ToolDescriptor = { name: ToolName; description: string; arguments: string };
export type TranscriptEntry = { step: number; tool: ToolName; arguments: unknown; result: unknown };
export type AgentStepRequest = {
  goal: "plan_next_purchases";
  tools: ToolDescriptor[];
  transcript: TranscriptEntry[];
  budget: { stepsLeft: number; toolCallsLeft: number };
};
/** One provider attempt. Retry, fallback and budgets belong to the orchestrator. */
export type AgentTransport = (model: AdviceModel, request: AgentStepRequest, signal: AbortSignal) => Promise<ProviderResponse>;

export type StepLog = {
  step: number;
  model: AdviceModel;
  decision: "tool_request" | "final" | "rejected";
  tool?: string;
  validation: "accepted" | "rejected";
  latencyMs: number;
  usage?: ProviderUsage;
};

export type AgentOutcome = {
  runId: string;
  status: AgentRunStatus;
  stopReason: StopReason;
  revision: number;
  steps: number;
  toolCalls: number;
  providerAttempts: number;
  elapsedMs: number;
  result?: AgentResult;
  planLine?: string;
  log: StepLog[];
};

export type AgentAttemptEvent = {
  event: "shop_agent_provider_attempt";
  runId: string;
  step: number;
  attempt: number;
  model: AdviceModel;
  status: "success" | "failure";
  errorClass?: ProviderErrorClass;
  providerStatus?: number;
  latencyMs: number;
  usage?: ProviderUsage;
};
export type AgentRunEvent = {
  event: "shop_agent_run";
  runId: string;
  status: AgentRunStatus;
  stopReason: StopReason;
  steps: number;
  toolCalls: number;
  providerAttempts: number;
  elapsedMs: number;
  stepLog: StepLog[];
};
export type AgentTelemetrySink = (event: AgentAttemptEvent | AgentRunEvent) => void;

export type ToolContext = { snapshot: GameSnapshot; history: readonly RunHistoryEntry[] };
export type ToolDefinition = {
  name: ToolName;
  descriptor: ToolDescriptor;
  validateArgs(value: unknown): { ok: true; value: Record<string, unknown> } | { ok: false };
  execute(args: Record<string, unknown>, context: ToolContext): unknown;
  validateResult(value: unknown): boolean;
};
export type ToolRegistry = Readonly<Record<ToolName, ToolDefinition>>;
