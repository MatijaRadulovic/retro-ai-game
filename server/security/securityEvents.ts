import { randomUUID } from "node:crypto";

export type SecurityOperation = "bootstrap" | "create_game" | "read_game" | "shop_advice" | "shop_agent" | "game_action" | "unknown";
export type SecurityReason = "request_forbidden" | "session_required" | "session_expired" | "session_rate_limited"
  | "invalid_json" | "invalid_request" | "payload_too_large" | "unsupported_media_type" | "game_not_found"
  | "agent_busy" | "agent_rate_limited" | "capacity_exhausted" | "request_rejected";
export type SecurityEvent = Readonly<{
  event: "w08_request_denied";
  correlationId: string;
  operation: SecurityOperation;
  reason: SecurityReason;
  status: 400 | 401 | 403 | 404 | 409 | 413 | 415 | 429 | 503 | 500;
}>;
export type SecurityEventSink = (event: SecurityEvent) => void;

const SAFE_REASONS = new Set<SecurityReason>([
  "request_forbidden", "session_required", "session_expired", "session_rate_limited", "invalid_json", "invalid_request",
  "payload_too_large", "unsupported_media_type", "game_not_found", "agent_busy", "agent_rate_limited",
  "capacity_exhausted", "request_rejected",
]);
const SAFE_OPERATIONS = new Set<SecurityOperation>(["bootstrap", "create_game", "read_game", "shop_advice", "shop_agent", "game_action", "unknown"]);

export function createSecurityEvent(input: {
  operation: SecurityOperation;
  reason: string;
  status: number;
  correlationId?: string;
}): SecurityEvent {
  const reason = SAFE_REASONS.has(input.reason as SecurityReason) ? input.reason as SecurityReason : "request_rejected";
  const status = ([400, 401, 403, 404, 409, 413, 415, 429, 503].includes(input.status) ? input.status : 500) as SecurityEvent["status"];
  const operation = SAFE_OPERATIONS.has(input.operation) ? input.operation : "unknown";
  const correlationId = input.correlationId && /^[0-9a-f-]{36}$/i.test(input.correlationId) ? input.correlationId : randomUUID();
  return Object.freeze({ event: "w08_request_denied", correlationId, operation, reason, status });
}

export function emitSecurityEvent(sink: SecurityEventSink, event: SecurityEvent): void {
  try { sink(event); } catch { /* Observability must never change request handling. */ }
}
