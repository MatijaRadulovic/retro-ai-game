import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";

export type RequestOperation = "bootstrap" | "create_game" | "read_game" | "shop_advice" | "shop_agent" | "game_action" | "unknown";
export type RequestContext = Readonly<{
  correlationId: string;
  scopeId: string;
  operation: RequestOperation;
  originClass: "allowed_browser" | "non_browser_internal";
  receivedAt: number;
}>;

export function createRequestContext(request: IncomingMessage, scopeId: string, now = performance.now()): RequestContext {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  let operation: RequestOperation = "unknown";
  if (request.method === "POST" && path === "/api/games") operation = "create_game";
  else if (request.method === "GET" && /^\/api\/games\/[^/]+$/.test(path)) operation = "read_game";
  else if (/^\/api\/games\/[^/]+\/shop-advice$/.test(path)) operation = "shop_advice";
  else if (/^\/api\/games\/[^/]+\/shop-agent$/.test(path)) operation = "shop_agent";
  else if (/^\/api\/games\/[^/]+\/(?:move|pause|resume|restart|perks)$/.test(path)) operation = "game_action";
  return Object.freeze({
    correlationId: randomUUID(),
    scopeId,
    operation,
    originClass: request.headers.origin ? "allowed_browser" : "non_browser_internal",
    receivedAt: now,
  });
}
