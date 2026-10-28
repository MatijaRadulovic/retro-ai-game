import { randomUUID } from "node:crypto";
import { ADVICE_MODELS } from "../../src/ai/shopAdvice.ts";
import { STOP_REASONS, TOOL_NAMES, type AgentRunStatus, type StopReason, type ToolName } from "../../src/ai/shopAgent.ts";
import { W08_SECURITY_LIMITS } from "./securityLimits.ts";
import type { AgentAttemptEvent, AgentRunEvent, AgentToolRejectedEvent } from "../agent/types.ts";

export type SecurityOperation = "bootstrap" | "create_game" | "read_game" | "game_events" | "shop_advice" | "shop_agent" | "game_action" | "unknown";
export type SecurityReason = "request_forbidden" | "session_required" | "session_expired" | "session_rate_limited"
  | "invalid_json" | "invalid_request" | "payload_too_large" | "unsupported_media_type" | "game_not_found"
  | "session_capacity_exhausted" | "agent_busy" | "agent_rate_limited" | "agent_capacity_exhausted"
  | "invalid_status" | "invalid_move" | "invalid_purchase" | "subscription_limit" | "route_not_found" | "internal_error"
  | "capacity_exhausted" | "request_rejected";

type EventBase = Readonly<{
  event: "w08_security_event";
  correlationId: string;
  operation: "shop_agent" | SecurityOperation;
}>;

export type RequestDeniedEvent = EventBase & Readonly<{
  kind: "request_denied";
  outcome: "denied";
  reason: SecurityReason;
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 500 | 503;
  providerAttempts: 0 | null;
  toolCalls: 0 | null;
}>;

export type ProviderAttemptSecurityEvent = EventBase & Readonly<{
  operation: "shop_agent";
  kind: "provider_attempt";
  outcome: "success" | "failure";
  reason: "none" | "network" | "timeout" | "rate_limited" | "provider_unavailable" | "bad_request" | "unauthorized"
    | "forbidden" | "model_unavailable" | "conflict" | "provider_error" | "refusal" | "empty_output"
    | "invalid_json" | "response_too_large" | "invalid_output" | "cancelled" | "unknown";
  model: typeof ADVICE_MODELS[number];
  step: number;
  attempt: number;
  providerAttempts: number;
  toolCalls: number;
  latencyMs: number;
  providerStatus?: number;
}>;

export type ToolRejectedSecurityEvent = EventBase & Readonly<{
  operation: "shop_agent";
  kind: "tool_rejected";
  outcome: "denied";
  reason: "unknown_tool" | "invalid_tool_arguments" | "tool_failed" | "step_limit" | "tool_call_limit"
    | "repeated_action" | "stale";
  tool: ToolName | "unknown";
  step: number;
  providerAttempts: number;
  toolCalls: number;
}>;

export type AgentRunSecurityEvent = EventBase & Readonly<{
  operation: "shop_agent";
  kind: "agent_run_finished";
  outcome: AgentRunStatus;
  reason: StopReason;
  steps: number;
  toolCalls: number;
  providerAttempts: number;
  elapsedMs: number;
}>;

export type SecurityEvent = RequestDeniedEvent | ProviderAttemptSecurityEvent | ToolRejectedSecurityEvent | AgentRunSecurityEvent;
export type SecurityEventSink = (event: SecurityEvent) => void;

const SAFE_REASONS = new Set<SecurityReason>([
  "request_forbidden", "session_required", "session_expired", "session_rate_limited", "invalid_json", "invalid_request",
  "payload_too_large", "unsupported_media_type", "game_not_found", "session_capacity_exhausted", "agent_busy", "agent_rate_limited",
  "agent_capacity_exhausted", "invalid_status", "invalid_move", "invalid_purchase", "subscription_limit", "route_not_found", "internal_error",
  "capacity_exhausted", "request_rejected",
]);
const SAFE_OPERATIONS = new Set<SecurityOperation>(["bootstrap", "create_game", "read_game", "game_events", "shop_advice", "shop_agent", "game_action", "unknown"]);
const SAFE_PROVIDER_ERRORS = new Set([
  "network", "timeout", "rate_limited", "provider_unavailable", "bad_request", "unauthorized", "forbidden",
  "model_unavailable", "conflict", "provider_error", "refusal", "empty_output", "invalid_json", "response_too_large",
  "invalid_output", "cancelled",
]);
const SAFE_TOOL_REJECTIONS = new Set<ToolRejectedSecurityEvent["reason"]>([
  "unknown_tool", "invalid_tool_arguments", "tool_failed", "step_limit", "tool_call_limit", "repeated_action", "stale",
]);

function correlationValue(value?: string): string {
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : randomUUID();
}

function boundedCounter(value: number, maximum: number): number {
  return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, maximum) : 0;
}

function safeStatus(value: number): RequestDeniedEvent["status"] {
  return ([400, 401, 403, 404, 409, 413, 415, 429, 500, 503].includes(value) ? value : 500) as RequestDeniedEvent["status"];
}

export function createSecurityEvent(input: {
  operation: SecurityOperation;
  reason: string;
  status: number;
  correlationId?: string;
}): RequestDeniedEvent {
  const reason = SAFE_REASONS.has(input.reason as SecurityReason) ? input.reason as SecurityReason : "request_rejected";
  const status = safeStatus(input.status);
  return Object.freeze({
    event: "w08_security_event", kind: "request_denied", outcome: "denied",
    correlationId: correlationValue(input.correlationId),
    operation: SAFE_OPERATIONS.has(input.operation) ? input.operation : "unknown",
    reason, status, providerAttempts: status >= 500 ? null : 0, toolCalls: status >= 500 ? null : 0,
  });
}

export function createAgentSecurityEvent(
  input: AgentAttemptEvent | AgentToolRejectedEvent | AgentRunEvent,
  correlationId?: string,
): ProviderAttemptSecurityEvent | ToolRejectedSecurityEvent | AgentRunSecurityEvent {
  const base = { event: "w08_security_event" as const, operation: "shop_agent" as const, correlationId: correlationValue(correlationId) };
  if (input.event === "shop_agent_provider_attempt") {
    const providerError = input.errorClass && SAFE_PROVIDER_ERRORS.has(input.errorClass) ? input.errorClass as ProviderAttemptSecurityEvent["reason"] : "unknown";
    return Object.freeze({
      ...base,
      kind: "provider_attempt",
      outcome: input.status === "success" ? "success" : "failure",
      reason: input.status === "success" ? "none" : providerError,
      model: ADVICE_MODELS.includes(input.model) ? input.model : ADVICE_MODELS[0],
      step: boundedCounter(input.step, W08_SECURITY_LIMITS.agent.maxDecisions),
      attempt: boundedCounter(input.attempt, W08_SECURITY_LIMITS.agent.maxProviderAttempts),
      providerAttempts: boundedCounter(input.providerAttempts, W08_SECURITY_LIMITS.agent.maxProviderAttempts),
      toolCalls: boundedCounter(input.toolCalls, W08_SECURITY_LIMITS.agent.maxToolCalls),
      latencyMs: boundedCounter(input.latencyMs, W08_SECURITY_LIMITS.agent.providerCallTimeoutMs),
      ...(Number.isInteger(input.providerStatus) && input.providerStatus! >= 100 && input.providerStatus! <= 599
        ? { providerStatus: input.providerStatus } : {}),
    });
  }
  if (input.event === "shop_agent_tool_rejected") {
    const reason = SAFE_TOOL_REJECTIONS.has(input.reason) ? input.reason : "tool_failed";
    return Object.freeze({
      ...base,
      kind: "tool_rejected",
      outcome: "denied",
      reason,
      tool: input.tool && TOOL_NAMES.includes(input.tool) ? input.tool : "unknown",
      step: boundedCounter(input.step, W08_SECURITY_LIMITS.agent.maxDecisions),
      providerAttempts: boundedCounter(input.providerAttempts, W08_SECURITY_LIMITS.agent.maxProviderAttempts),
      toolCalls: boundedCounter(input.toolCalls, W08_SECURITY_LIMITS.agent.maxToolCalls),
    });
  }
  const reason = STOP_REASONS.includes(input.stopReason) ? input.stopReason : "provider_failed";
  const outcome: AgentRunStatus = input.status === "completed" || input.status === "failed" ? input.status : "stopped";
  return Object.freeze({
    ...base,
    kind: "agent_run_finished",
    outcome,
    reason,
    steps: boundedCounter(input.steps, W08_SECURITY_LIMITS.agent.maxDecisions),
    toolCalls: boundedCounter(input.toolCalls, W08_SECURITY_LIMITS.agent.maxToolCalls),
    providerAttempts: boundedCounter(input.providerAttempts, W08_SECURITY_LIMITS.agent.maxProviderAttempts),
    elapsedMs: boundedCounter(input.elapsedMs, W08_SECURITY_LIMITS.agent.totalDeadlineMs),
  });
}

export function emitSecurityEvent(sink: SecurityEventSink, event: SecurityEvent): void {
  try { sink(event); } catch { /* Observability must never change request handling. */ }
}
