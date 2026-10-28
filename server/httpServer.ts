import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { GameSessionManager, SessionError } from "./gameSession.ts";
import type { Direction } from "../src/game/snakeEngine.ts";
import { createShopAdvisor, type ShopAdvisor } from "./ai/shopAdvice.ts";
import { AGENT_GOAL } from "../src/ai/shopAgent.ts";
import { createShopAgent, type ShopAgent } from "./agent/shopAgent.ts";
import { SessionStore, SessionStoreError } from "./security/sessionStore.ts";
import { W08_SECURITY_LIMITS } from "./security/securityLimits.ts";
import { createRequestContext } from "./security/requestContext.ts";
import { ResourceAdmissionError, ResourceGovernor } from "./security/resourceGovernor.ts";
import { createSecurityEvent, emitSecurityEvent, type SecurityEventSink, type SecurityOperation } from "./security/securityEvents.ts";

type ApiError = { error: { code: string; message: string } };

class HttpError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8", "cache-control": "no-store",
    "x-content-type-options": "nosniff", "referrer-policy": "no-referrer",
  });
  response.end(JSON.stringify(value));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"];
  if (typeof contentType !== "string" || !/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(contentType)) {
    throw new HttpError(415, "unsupported_media_type", "Content-Type must be application/json.");
  }
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    length += buffer.length;
    if (length > W08_SECURITY_LIMITS.requestBodyBytes) throw new HttpError(413, "payload_too_large", "Request body is too large.");
    chunks.push(buffer);
  }
  if (length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "invalid_json", "Request body must be valid JSON.");
  }
}

function isDirection(value: unknown): value is Direction {
  return value === "up" || value === "right" || value === "down" || value === "left";
}

function asHttpError(error: unknown): HttpError {
  if (error instanceof HttpError) return error;
  if (error instanceof SessionError) {
    const status = error.code === "game_not_found" ? 404 : error.code === "capacity_exhausted" ? 503 : 409;
    return new HttpError(status, error.code, error.message);
  }
  if (error instanceof SessionStoreError) return new HttpError(error.code === "session_rate_limited" ? 429 : 503, error.code, "Session access is temporarily unavailable.");
  if (error instanceof ResourceAdmissionError) {
    const status = error.code === "agent_busy" ? 409 : error.code === "agent_rate_limited" ? 429 : 503;
    return new HttpError(status, error.code, "The agent is temporarily unavailable.");
  }
  return new HttpError(500, "internal_error", "The server could not complete the request.");
}

function readCookie(request: IncomingMessage, name: string): string | undefined {
  const header = request.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator > 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return undefined;
}

function operationFor(request: IncomingMessage): SecurityOperation {
  const path = new URL(request.url ?? "/", "http://localhost").pathname;
  if (path === "/api/session") return "bootstrap";
  if (path === "/api/games") return request.method === "POST" ? "create_game" : "unknown";
  if (/^\/api\/games\/[^/]+$/.test(path)) return "read_game";
  if (/^\/api\/games\/[^/]+\/shop-advice$/.test(path)) return "shop_advice";
  if (/^\/api\/games\/[^/]+\/shop-agent$/.test(path)) return "shop_agent";
  if (/^\/api\/games\/[^/]+\/(move|pause|resume|restart|perks)$/.test(path)) return "game_action";
  return "unknown";
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, manager: GameSessionManager, advisor: ShopAdvisor, agent: ShopAgent, sessions: SessionStore, governor: ResourceGovernor, clientOrigin: string, securityEventSink: SecurityEventSink): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    const path = url.pathname.split("/").filter(Boolean);
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/session") {
      if (request.headers.origin !== clientOrigin) throw new HttpError(403, "request_forbidden", "Request was not allowed.");
      const body = await readJson(request);
      if (!isRecord(body) || Object.keys(body).length !== 0) throw new HttpError(400, "invalid_request", "Expected an empty object.");
      const issued = sessions.create(readCookie(request, "retro_session"));
      const secureCookie = clientOrigin.startsWith("https://") ? "; Secure" : "";
      response.setHeader("set-cookie", `retro_session=${issued.token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=${issued.expiresInSeconds}${secureCookie}`);
      sendJson(response, 201, { requestVerifier: issued.verifier, expiresInSeconds: issued.expiresInSeconds });
      return;
    }
    const origin = request.headers.origin;
    if (origin !== undefined && origin !== clientOrigin) throw new HttpError(403, "request_forbidden", "Request was not allowed.");
    const verifierHeader = request.headers["x-retro-request"];
    const authorization = sessions.authorizeDetailed(readCookie(request, "retro_session"), Array.isArray(verifierHeader) ? undefined : verifierHeader);
    if (!authorization.scope) {
      const expired = authorization.failure === "session_expired";
      const forbidden = authorization.failure === "request_forbidden";
      throw new HttpError(expired ? 401 : forbidden ? 403 : 401, expired ? "session_expired" : forbidden ? "request_forbidden" : "session_required", "Request was not allowed.");
    }
    const scope = authorization.scope;
    const context = createRequestContext(request, scope.scopeId);
    response.setHeader("x-correlation-id", context.correlationId);
    if (request.method === "POST" && url.pathname === "/api/games") {
      const body = await readJson(request);
      if (!isRecord(body) || Object.keys(body).some((key) => key !== "config")) {
        throw new HttpError(400, "invalid_request", "Expected an object with an optional config field.");
      }
      const game = manager.createOwned(scope.scopeId, body.config);
      sendJson(response, 201, { game });
      return;
    }
    if (path[0] !== "api" || path[1] !== "games" || !path[2] || path.length > 4) {
      throw new HttpError(404, "route_not_found", "API route was not found.");
    }
    const gameId = path[2];
    if (request.method === "GET" && path.length === 3) {
      sendJson(response, 200, { game: manager.getOwned(gameId, scope.scopeId) });
      return;
    }
    if (request.method === "POST" && path.length === 4) {
      const action = path[3];
      if (action === "shop-advice") {
        const body = await readJson(request);
        if (!isRecord(body) || Object.keys(body).length !== 0) {
          throw new HttpError(400, "invalid_request", "Shop advice does not accept request fields.");
        }
        const snapshot = manager.getOwned(gameId, scope.scopeId);
        if (snapshot.state.status !== "paused") {
          throw new HttpError(409, "invalid_status", "Shop advice is available only while paused.");
        }
        const controller = new AbortController();
        const onClose = () => { if (!response.writableEnded) controller.abort(); };
        response.once("close", onClose);
        const releasePin = manager.pinOwned(gameId, scope.scopeId);
        try {
          const advice = await advisor.advise(manager, gameId, controller.signal);
          if (!response.destroyed) sendJson(response, 200, { advice });
        } finally {
          releasePin();
          response.removeListener("close", onClose);
        }
        return;
      }
      if (action === "shop-agent") {
        const body = await readJson(request);
        if (!isRecord(body) || Object.keys(body).length !== 1 || body.goal !== AGENT_GOAL) {
          throw new HttpError(400, "invalid_request", `Shop agent expects exactly {"goal":"${AGENT_GOAL}"}.`);
        }
        const snapshot = manager.getOwned(gameId, scope.scopeId);
        if (snapshot.state.status !== "paused") {
          throw new HttpError(409, "invalid_status", "Shop agent is available only while paused.");
        }
        const controller = new AbortController();
        const onClose = () => { if (!response.writableEnded) controller.abort(); };
        response.once("close", onClose);
        const releasePin = manager.pinOwned(gameId, scope.scopeId);
        try {
          const run = await agent.run(manager, gameId, controller.signal, scope.scopeId, governor);
          if (!response.destroyed) sendJson(response, 200, { run });
        } finally {
          releasePin();
          response.removeListener("close", onClose);
        }
        return;
      }
      if (action === "move") {
        const body = await readJson(request);
        if (!isRecord(body) || Object.keys(body).length !== 1 || !isDirection(body.direction)) {
          throw new HttpError(400, "invalid_move", "Expected a direction: up, right, down, or left.");
        }
        sendJson(response, 200, { game: manager.moveOwned(gameId, scope.scopeId, body.direction) });
        return;
      }
      if (action === "perks") {
        const body = await readJson(request);
        if (!isRecord(body) || Object.keys(body).length !== 1
          || (body.perk !== "extra_xp" && body.perk !== "extra_life" && body.perk !== "luck")) {
          throw new HttpError(400, "invalid_purchase", "Expected exactly one perk: extra_xp, extra_life, or luck.");
        }
        sendJson(response, 200, { game: manager.purchasePerkOwned(gameId, scope.scopeId, body.perk) });
        return;
      }
      if (["pause", "resume", "restart"].includes(action)) {
        const body = await readJson(request);
        if (!isRecord(body) || Object.keys(body).length !== 0) {
          throw new HttpError(400, "invalid_request", "This action does not accept request fields.");
        }
        const game = action === "pause" ? manager.pauseOwned(gameId, scope.scopeId)
          : action === "resume" ? manager.resumeOwned(gameId, scope.scopeId)
            : manager.restartOwned(gameId, scope.scopeId);
        sendJson(response, 200, { game });
        return;
      }
    }
    throw new HttpError(404, "route_not_found", "API route was not found.");
  } catch (error) {
    const apiError = asHttpError(error);
    const event = createSecurityEvent({ operation: operationFor(request), reason: apiError.code, status: apiError.status });
    emitSecurityEvent(securityEventSink, event);
    if (error instanceof SessionStoreError && error.code === "session_rate_limited") response.setHeader("retry-after", "60");
    if (error instanceof ResourceAdmissionError && error.code === "agent_rate_limited") response.setHeader("retry-after", "60");
    const body: ApiError = { error: { code: apiError.code, message: apiError.message } };
    if (!response.destroyed) sendJson(response, apiError.status, body);
  }
}

export function createGameHttpServer(
  manager: GameSessionManager = new GameSessionManager(),
  advisor: ShopAdvisor = createShopAdvisor(null),
  agent: ShopAgent = createShopAgent(null),
  options: { sessionStore?: SessionStore; clientOrigin?: string; securityEventSink?: SecurityEventSink } = {},
): Server {
  const sessions = options.sessionStore ?? new SessionStore();
  const governor = new ResourceGovernor();
  sessions.setExpiryHandler((scopeId) => {
    manager.destroyOwnedScope(scopeId);
    governor.clearScope(scopeId);
  });
  const clientOrigin = options.clientOrigin ?? process.env.CLIENT_ORIGIN ?? "http://localhost:5173";
  const securityEventSink = options.securityEventSink ?? ((event) => console.warn(JSON.stringify(event)));
  const server = createServer((request, response) => {
    void handleRequest(request, response, manager, advisor, agent, sessions, governor, clientOrigin, securityEventSink);
  });
  const webSockets = new WebSocketServer({ noServer: true });
  const cleanupTimer = setInterval(() => {
    sessions.sweep();
    manager.cleanupExpired();
  }, 60_000);
  cleanupTimer.unref();

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "/", "http://localhost");
    const match = /^\/api\/games\/([^/]+)\/events$/.exec(url.pathname);
    if (!match) {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    const gameId = decodeURIComponent(match[1]);
    const origin = request.headers.origin;
    const verifier = request.headers["sec-websocket-protocol"]?.split(",").map((value) => value.trim()).find((value) => value.startsWith("retro-verifier."))?.slice("retro-verifier.".length);
    const authorization = origin === clientOrigin ? sessions.authorizeDetailed(readCookie(request, "retro_session"), verifier) : { scope: null, failure: "request_forbidden" as const };
    if (!authorization.scope) {
      const status = authorization.failure === "session_required" || authorization.failure === "session_expired" ? 401 : 403;
      socket.write(`HTTP/1.1 ${status} ${status === 401 ? "Unauthorized" : "Forbidden"}\r\n\r\n`);
      socket.destroy();
      return;
    }
    const scope = authorization.scope;
    try {
      manager.getOwned(gameId, scope.scopeId);
    } catch {
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      socket.destroy();
      return;
    }
    try {
      if (!manager.canSubscribeOwned(gameId, scope.scopeId)) throw new Error("subscription capacity");
    } catch {
      socket.write("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      socket.destroy();
      return;
    }
    webSockets.handleUpgrade(request, socket, head, (client) => {
      webSockets.emit("connection", client, request, gameId, scope.scopeId);
    });
  });

  webSockets.on("connection", (client: WebSocket, _request: IncomingMessage, gameId: string, scopeId: string) => {
    let unsubscribe = () => {};
    try {
      unsubscribe = manager.subscribeOwned(gameId, scopeId, (game) => {
        if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: "snapshot", game }));
      }, () => client.close(1008, "Session expired"));
    } catch {
      client.close(1008, "Game session not found");
      return;
    }
    client.on("message", () => client.close(1008, "This connection only sends snapshots"));
    client.once("close", unsubscribe);
    client.once("error", unsubscribe);
  });

  server.on("close", () => {
    clearInterval(cleanupTimer);
    webSockets.close();
    manager.close();
  });
  return server;
}
