import { validateGameSnapshot, type GameSnapshot } from "../game/gameProtocol.ts";
import type { Direction } from "../game/snakeEngine.ts";
import { validateShopAdviceResult, type ShopAdviceResult } from "../ai/shopAdvice.ts";
import { AGENT_GOAL, validatePublicAgentRun, type PublicAgentRun } from "../ai/shopAgent.ts";

export class GameApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
    this.name = "GameApiError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const REQUEST_VERIFIER_KEY = "retro-snake-request-verifier";
let bootstrapPromise: Promise<string> | undefined;

async function requestVerifier(): Promise<string> {
  try {
    const current = window.sessionStorage.getItem(REQUEST_VERIFIER_KEY);
    if (current) return current;
    if (!bootstrapPromise) {
      bootstrapPromise = (async () => {
        const response = await fetch("/api/session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
          credentials: "same-origin",
        });
        const payload: unknown = await response.json();
        if (!response.ok || !isRecord(payload) || typeof payload.requestVerifier !== "string" || payload.requestVerifier.length < 32) {
          throw new Error("Session bootstrap failed");
        }
        window.sessionStorage.setItem(REQUEST_VERIFIER_KEY, payload.requestVerifier);
        return payload.requestVerifier;
      })().finally(() => { bootstrapPromise = undefined; });
    }
    return await bootstrapPromise;
  } catch {
    throw new GameApiError("session_unavailable", "BROWSER SESSION IS UNAVAILABLE. RELOAD THE PAGE.", 0);
  }
}

async function request(path: string, method = "GET", body?: unknown): Promise<GameSnapshot> {
  let response: Response;
  try {
    const verifier = await requestVerifier();
    response = await fetch(path, {
      method,
      headers: body === undefined ? { "x-retro-request": verifier } : { "content-type": "application/json", "x-retro-request": verifier },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new GameApiError("server_unavailable", "GAME SERVER IS UNAVAILABLE.", 0);
  }
  let result: unknown;
  try {
    result = await response.json() as unknown;
  } catch {
    throw new GameApiError("invalid_server_response", "GAME SERVER RETURNED AN INVALID RESPONSE.", response.status);
  }
  if (!response.ok) {
    const error = isRecord(result) && isRecord(result.error) ? result.error : null;
    throw new GameApiError(
      typeof error?.code === "string" ? error.code : "request_failed",
      typeof error?.message === "string" ? error.message : "GAME REQUEST FAILED.",
      response.status,
    );
  }
  const game = isRecord(result) ? validateGameSnapshot(result.game) : null;
  if (!game) throw new GameApiError("invalid_server_response", "GAME SERVER RETURNED AN INVALID SNAPSHOT.", response.status);
  return game;
}

async function requestShopAdvice(gameId: string, signal?: AbortSignal): Promise<ShopAdviceResult> {
  let response: Response;
  try {
    const verifier = await requestVerifier();
    response = await fetch(`/api/games/${encodeURIComponent(gameId)}/shop-advice`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-retro-request": verifier },
      body: "{}",
      credentials: "same-origin",
      signal,
    });
  } catch {
    throw new GameApiError(signal?.aborted ? "cancelled" : "server_unavailable", "SHOP ADVICE IS UNAVAILABLE.", 0);
  }
  let result: unknown;
  try {
    result = await response.json() as unknown;
  } catch {
    throw new GameApiError("invalid_server_response", "SHOP ADVICE IS UNAVAILABLE.", response.status);
  }
  if (!response.ok) {
    const error = isRecord(result) && isRecord(result.error) ? result.error : null;
    throw new GameApiError(typeof error?.code === "string" ? error.code : "request_failed", "SHOP ADVICE IS UNAVAILABLE.", response.status);
  }
  if (!isRecord(result) || Object.keys(result).length !== 1) {
    throw new GameApiError("invalid_server_response", "SHOP ADVICE IS UNAVAILABLE.", response.status);
  }
  const advice = validateShopAdviceResult(result.advice);
  if (!advice) throw new GameApiError("invalid_server_response", "SHOP ADVICE IS UNAVAILABLE.", response.status);
  return advice;
}

async function requestShopAgent(gameId: string, signal?: AbortSignal): Promise<PublicAgentRun> {
  const unavailable = "SHOP STRATEGIST IS UNAVAILABLE.";
  let response: Response;
  try {
    const verifier = await requestVerifier();
    response = await fetch(`/api/games/${encodeURIComponent(gameId)}/shop-agent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-retro-request": verifier },
      body: JSON.stringify({ goal: AGENT_GOAL }),
      signal,
      credentials: "same-origin",
    });
  } catch {
    throw new GameApiError(signal?.aborted ? "cancelled" : "server_unavailable", unavailable, 0);
  }
  let result: unknown;
  try {
    result = await response.json() as unknown;
  } catch {
    throw new GameApiError("invalid_server_response", unavailable, response.status);
  }
  if (!response.ok) {
    const error = isRecord(result) && isRecord(result.error) ? result.error : null;
    throw new GameApiError(typeof error?.code === "string" ? error.code : "request_failed", unavailable, response.status);
  }
  const run = isRecord(result) && Object.keys(result).length === 1 ? validatePublicAgentRun(result.run) : null;
  if (!run) throw new GameApiError("invalid_server_response", unavailable, response.status);
  return run;
}

export const gameClient = {
  create: () => request("/api/games", "POST", {}),
  get: (gameId: string) => request(`/api/games/${encodeURIComponent(gameId)}`),
  move: (gameId: string, direction: Direction) => request(`/api/games/${encodeURIComponent(gameId)}/move`, "POST", { direction }),
  pause: (gameId: string) => request(`/api/games/${encodeURIComponent(gameId)}/pause`, "POST", {}),
  resume: (gameId: string) => request(`/api/games/${encodeURIComponent(gameId)}/resume`, "POST", {}),
  restart: (gameId: string) => request(`/api/games/${encodeURIComponent(gameId)}/restart`, "POST", {}),
  purchasePerk: (gameId: string, perk: "extra_xp" | "extra_life" | "luck") => request(`/api/games/${encodeURIComponent(gameId)}/perks`, "POST", { perk }),
  shopAdvice: requestShopAdvice,
  shopAgent: requestShopAgent,
};

export function connectGameEvents(gameId: string, onSnapshot: (snapshot: GameSnapshot) => void, onConnection: (connected: boolean) => void): () => void {
  let socket: WebSocket | undefined;
  let stopped = false;
  let reconnectTimer: number | undefined;
  let retryMs = 500;

  const connect = (verifier: string) => {
    if (stopped) return;
    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    socket = new WebSocket(`${scheme}//${window.location.host}/api/games/${encodeURIComponent(gameId)}/events`, ["retro-snake", `retro-verifier.${verifier}`]);
    socket.addEventListener("open", () => {
      retryMs = 500;
      onConnection(true);
    });
    socket.addEventListener("message", (event) => {
      try {
        const message: unknown = JSON.parse(String(event.data));
        if (!isRecord(message) || message.type !== "snapshot") return;
        const snapshot = validateGameSnapshot(message.game);
        if (snapshot) onSnapshot(snapshot);
      } catch {
        // Ignore malformed event data; the next valid authoritative snapshot will recover the view.
      }
    });
    socket.addEventListener("close", () => {
      onConnection(false);
      if (stopped) return;
      try { window.sessionStorage.removeItem(REQUEST_VERIFIER_KEY); } catch { /* session state is optional when storage is unavailable */ }
      reconnectTimer = window.setTimeout(() => { void requestVerifier().then(connect); }, retryMs);
      retryMs = Math.min(retryMs * 2, 8_000);
    });
    socket.addEventListener("error", () => socket?.close());
  };

  void requestVerifier().then(connect).catch(() => onConnection(false));
  return () => {
    stopped = true;
    if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
