import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createGameHttpServer } from "../server/httpServer.ts";
import { GameSessionManager } from "../server/gameSession.ts";
import { createShopAdvisor, type ShopAdvisor } from "../server/ai/shopAdvice.ts";

async function startServer(random: () => number = () => 0, advisor: ShopAdvisor = createShopAdvisor(null)) {
  let id = 0;
  const manager = new GameSessionManager(random, () => `api-${++id}`);
  const server = createGameHttpServer(manager, advisor);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const rawFetch = globalThis.fetch;
  const clientOrigin = "http://localhost:5173";
  let cookie = "";
  let verifier = "";
  let scopeReady: Promise<void> | undefined;
  const ensureSession = async () => {
    if (cookie && verifier) return;
    if (!scopeReady) {
      scopeReady = (async () => {
        const response = await rawFetch(`${baseUrl}/api/session`, { method: "POST", headers: { "content-type": "application/json", origin: clientOrigin }, body: "{}" });
        const payload = await response.json() as { requestVerifier: string };
        cookie = response.headers.get("set-cookie")!.split(";")[0]!;
        verifier = payload.requestVerifier;
      })();
    }
    await scopeReady;
  };
  const appFetch = async (input: string | URL, init: RequestInit = {}) => {
    await ensureSession();
    const headers = new Headers(init.headers);
    if (init.method === "POST" && init.body === undefined) init = { ...init, body: "{}" };
    if (init.body !== undefined && !headers.has("content-type")) headers.set("content-type", "application/json");
    headers.set("cookie", cookie);
    headers.set("x-retro-request", verifier);
    headers.set("origin", clientOrigin);
    return rawFetch(input, { ...init, headers });
  };
  return {
    manager,
    server,
    baseUrl,
    fetch: appFetch,
    get cookie() { return cookie; },
    get verifier() { return verifier; },
    createGame: async () => {
      const response = await appFetch(`${baseUrl}/api/games`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      return (await response.json() as { game: ReturnType<GameSessionManager["get"]> }).game;
    },
    close: async () => {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    },
  };
}

async function json(response: Response): Promise<any> {
  return response.json();
}

test("HTTP API creates independent games and exposes server-owned actions", async () => {
  const app = await startServer();
  try {
    const firstResponse = await app.fetch(`${app.baseUrl}/api/games`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const first = (await json(firstResponse)).game;
    const secondResponse = await app.fetch(`${app.baseUrl}/api/games`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const second = (await json(secondResponse)).game;
    assert.equal(firstResponse.status, 201);
    assert.notEqual(first.id, second.id);
    assert.equal(first.players[0].id, "api-2");

    const getResponse = await app.fetch(`${app.baseUrl}/api/games/${first.id}`);
    assert.equal(getResponse.status, 200);
    assert.equal((await json(getResponse)).game.id, first.id);

    const moveResponse = await app.fetch(`${app.baseUrl}/api/games/${first.id}/move`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "up" }),
    });
    assert.equal((await json(moveResponse)).game.state.status, "playing");

    const pauseResponse = await app.fetch(`${app.baseUrl}/api/games/${first.id}/pause`, { method: "POST" });
    assert.equal((await json(pauseResponse)).game.state.status, "paused");
    const resumeResponse = await app.fetch(`${app.baseUrl}/api/games/${first.id}/resume`, { method: "POST" });
    assert.equal((await json(resumeResponse)).game.state.status, "playing");
    const restartResponse = await app.fetch(`${app.baseUrl}/api/games/${first.id}/restart`, { method: "POST" });
    assert.equal((await json(restartResponse)).game.state.status, "ready");
    assert.equal(app.manager.get(second.id).state.status, "ready");
  } finally {
    await app.close();
  }
});

test("HTTP API rejects malformed requests and missing game IDs safely", async () => {
  const app = await startServer();
  try {
    const badJson = await app.fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{" });
    assert.equal(badJson.status, 400);
    assert.equal((await json(badJson)).error.code, "invalid_json");

    const created = await app.fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{}" });
    const { game } = await json(created);
    const malformedPurchase = await app.fetch(`${app.baseUrl}/api/games/${game.id}/perks`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ perk: "unknown" }),
    });
    assert.equal(malformedPurchase.status, 400);
    assert.equal((await json(malformedPurchase)).error.code, "invalid_purchase");
    const wrongStatusPurchase = await app.fetch(`${app.baseUrl}/api/games/${game.id}/perks`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ perk: "extra_xp" }),
    });
    assert.equal(wrongStatusPurchase.status, 409);
    assert.equal((await json(wrongStatusPurchase)).error.code, "invalid_status");
    assert.equal(app.manager.get(game.id).revision, 0);
    const invalidMove = await app.fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "teleport" }),
    });
    assert.equal(invalidMove.status, 400);
    assert.equal((await json(invalidMove)).error.code, "invalid_move");

    const missing = await app.fetch(`${app.baseUrl}/api/games/unknown`);
    assert.equal(missing.status, 404);
    assert.equal((await json(missing)).error.code, "game_not_found");
    assert.equal(app.manager.get(game.id).revision, 0);
  } finally {
    await app.close();
  }
});

test("anonymous session verifier and ownership prevent cross-scope disclosure or mutation", async () => {
  const app = await startServer();
  try {
    const firstGame = await app.createGame();
    const secondBootstrap = await fetch(`${app.baseUrl}/api/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:5173" }, body: "{}",
    });
    assert.equal(secondBootstrap.status, 201);
    const secondVerifier = (await json(secondBootstrap)).requestVerifier as string;
    const secondCookie = secondBootstrap.headers.get("set-cookie")!.split(";")[0]!;
    const outsiderHeaders = { cookie: secondCookie, "x-retro-request": secondVerifier, origin: "http://localhost:5173" };
    const outsiderRead = await fetch(`${app.baseUrl}/api/games/${firstGame.id}`, { headers: outsiderHeaders });
    assert.equal(outsiderRead.status, 404);
    assert.equal((await json(outsiderRead)).error.code, "game_not_found");
    const outsiderMove = await fetch(`${app.baseUrl}/api/games/${firstGame.id}/move`, {
      method: "POST", headers: { ...outsiderHeaders, "content-type": "application/json" }, body: JSON.stringify({ direction: "up" }),
    });
    assert.equal(outsiderMove.status, 404);
    assert.equal(app.manager.get(firstGame.id).state.status, "ready");
    const outsiderAgent = await fetch(`${app.baseUrl}/api/games/${firstGame.id}/shop-agent`, {
      method: "POST", headers: { ...outsiderHeaders, "content-type": "application/json" }, body: JSON.stringify({ goal: "plan_next_purchases" }),
    });
    assert.equal(outsiderAgent.status, 404);
    const outsiderAdvice = await fetch(`${app.baseUrl}/api/games/${firstGame.id}/shop-advice`, {
      method: "POST", headers: { ...outsiderHeaders, "content-type": "application/json" }, body: "{}",
    });
    assert.equal(outsiderAdvice.status, 404);

    const missingCredential = await fetch(`${app.baseUrl}/api/games/${firstGame.id}`);
    assert.equal(missingCredential.status, 401);
    const invalidVerifier = await fetch(`${app.baseUrl}/api/games/${firstGame.id}`, { headers: { cookie: app.cookie, "x-retro-request": "invalid" } });
    assert.equal(invalidVerifier.status, 403);
    const invalidOrigin = await fetch(`${app.baseUrl}/api/games/${firstGame.id}`, { headers: { cookie: app.cookie, "x-retro-request": app.verifier, origin: "https://attacker.invalid" } });
    assert.equal(invalidOrigin.status, 403);
  } finally {
    await app.close();
  }
});

test("WebSocket requires the owning anonymous session, exact Origin, and verifier before upgrade", async () => {
  const app = await startServer();
  let gameSocket: WebSocket | undefined;
  try {
    const game = await app.createGame();
    const wrongOrigin = new WebSocket(`ws://${new URL(app.baseUrl).host}/api/games/${game.id}/events`, ["retro-snake", `retro-verifier.${app.verifier}`], {
      headers: { cookie: app.cookie, origin: "https://attacker.invalid" },
    });
    const [, originResponse] = await once(wrongOrigin, "unexpected-response");
    assert.equal((originResponse as import("node:http").IncomingMessage).statusCode, 403);

    gameSocket = new WebSocket(`ws://${new URL(app.baseUrl).host}/api/games/${game.id}/events`, ["retro-snake", "retro-verifier.invalid"], {
      headers: { cookie: app.cookie, origin: "http://localhost:5173" },
    });
    const [, verifierResponse] = await once(gameSocket, "unexpected-response");
    assert.equal((verifierResponse as import("node:http").IncomingMessage).statusCode, 403);
    const secondBootstrap = await fetch(`${app.baseUrl}/api/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:5173" }, body: "{}",
    });
    const secondVerifier = (await json(secondBootstrap)).requestVerifier as string;
    const foreignSocket = new WebSocket(`ws://${new URL(app.baseUrl).host}/api/games/${game.id}/events`, ["retro-snake", `retro-verifier.${secondVerifier}`], {
      headers: { cookie: secondBootstrap.headers.get("set-cookie")!.split(";")[0]!, origin: "http://localhost:5173" },
    });
    const [, foreignResponse] = await once(foreignSocket, "unexpected-response");
    assert.equal((foreignResponse as import("node:http").IncomingMessage).statusCode, 404);
  } finally {
    if (gameSocket?.readyState === WebSocket.OPEN) gameSocket.close();
    await app.close();
  }
});

test("protected JSON route rejects unsupported media type before game mutation", async () => {
  const app = await startServer();
  try {
    const game = await app.createGame();
    const response = await fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
      method: "POST",
      headers: { cookie: app.cookie, "x-retro-request": app.verifier, origin: "http://localhost:5173", "content-type": "text/plain" },
      body: '{"direction":"up"}',
    });
    assert.equal(response.status, 415);
    assert.equal(app.manager.get(game.id).state.status, "ready");
  } finally {
    await app.close();
  }
});

test("session bootstrap sets HttpOnly SameSite cookie and protected JSON has a byte limit", async () => {
  const app = await startServer();
  try {
    const bootstrap = await fetch(`${app.baseUrl}/api/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:5173" }, body: "{}",
    });
    assert.equal(bootstrap.status, 201);
    const setCookie = bootstrap.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /HttpOnly/i);
    assert.match(setCookie, /SameSite=Strict/i);
    assert.match(setCookie, /Path=\/api/i);
    const { requestVerifier } = await json(bootstrap);
    assert.equal(typeof requestVerifier, "string");

    const game = await app.createGame();
    const tooLarge = await fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
      method: "POST",
      headers: { cookie: app.cookie, "x-retro-request": app.verifier, origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ direction: "up", padding: "x".repeat(16_500) }),
    });
    assert.equal(tooLarge.status, 413);
    assert.equal((await json(tooLarge)).error.code, "payload_too_large");
    assert.equal(app.manager.get(game.id).state.status, "ready");
  } finally {
    await app.close();
  }
});

test("session bootstrap rate-limits the 21st successful-scope request with bounded Retry-After", async () => {
  const app = await startServer();
  try {
    const bootstrap = () => fetch(`${app.baseUrl}/api/session`, {
      method: "POST", headers: { "content-type": "application/json", origin: "http://localhost:5173" }, body: "{}",
    });
    for (let index = 0; index < 20; index += 1) assert.equal((await bootstrap()).status, 201);
    const limited = await bootstrap();
    assert.equal(limited.status, 429);
    assert.equal((await json(limited)).error.code, "session_rate_limited");
    assert.equal(limited.headers.get("retry-after"), "60");
  } finally {
    await app.close();
  }
});

test("shop advice route uses paused server state and leaves the revision unchanged", async () => {
  let calls = 0;
  const advisor = createShopAdvisor(async () => {
    calls += 1;
    return { value: { decision: "wait", reasonCode: "cannot_afford" } };
  }, { backoffScheduleMs: [0, 0, 0, 0, 0] });
  const app = await startServer(() => 0, advisor);
  try {
    const game = await app.createGame();
    const route = `${app.baseUrl}/api/games/${game.id}/shop-advice`;
    const headers = { "content-type": "application/json" };
    const wrongStatus = await app.fetch(route, { method: "POST", headers, body: "{}" });
    assert.equal(wrongStatus.status, 409);
    assert.equal((await json(wrongStatus)).error.code, "invalid_status");
    assert.equal(calls, 0);
    app.manager.move(game.id, "up");
    app.manager.pause(game.id);
    const before = app.manager.get(game.id);
    const extraField = await app.fetch(route, { method: "POST", headers, body: '{"model":"arbitrary"}' });
    assert.equal(extraField.status, 400);
    assert.equal((await json(extraField)).error.code, "invalid_request");
    assert.equal(calls, 0);
    const response = await app.fetch(route, { method: "POST", headers, body: "{}" });
    const result = await json(response);
    assert.equal(response.status, 200);
    assert.deepEqual(result.advice, {
      status: "advice",
      revision: before.revision,
      decision: "wait",
      reasonCode: "cannot_afford",
      message: "WAIT. SAVE POINTS UNTIL A PERK IS AFFORDABLE.",
      model: "gemini-3.8-flash",
    });
    assert.equal(calls, 1);
    assert.deepEqual(app.manager.get(game.id), before);
    const unknown = await app.fetch(`${app.baseUrl}/api/games/unknown/shop-advice`, { method: "POST", headers, body: "{}" });
    assert.equal(unknown.status, 404);
    assert.equal(calls, 1);
  } finally {
    await app.close();
  }
});

test("shop advice without a server key returns only a safe unavailable result", async () => {
  const app = await startServer();
  try {
    const game = await app.createGame();
    app.manager.move(game.id, "up");
    app.manager.pause(game.id);
    const before = app.manager.get(game.id);
    const response = await app.fetch(`${app.baseUrl}/api/games/${game.id}/shop-advice`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await json(response)).advice, {
      status: "unavailable", revision: before.revision, code: "not_configured",
      message: "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE.",
    });
    assert.deepEqual(app.manager.get(game.id), before);
  } finally {
    await app.close();
  }
});

test("shop advice route aborts provider work when the browser disconnects", async () => {
  let onStart: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { onStart = resolve; });
  let cancelled = false;
  const advisor = createShopAdvisor(async (_model, _context, signal) => {
    onStart?.();
    return new Promise((_resolve, reject) => signal.addEventListener("abort", () => {
      cancelled = true;
      reject(new Error("cancelled"));
    }, { once: true }));
  });
  const app = await startServer(() => 0, advisor);
  try {
    const game = await app.createGame();
    app.manager.move(game.id, "up");
    app.manager.pause(game.id);
    const controller = new AbortController();
    const request = app.fetch(`${app.baseUrl}/api/games/${game.id}/shop-advice`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}", signal: controller.signal,
    });
    await started;
    controller.abort();
    await assert.rejects(request);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(cancelled, true);
  } finally {
    await app.close();
  }
});

test("HTTP API applies a valid paused perk purchase and returns the updated snapshot", async () => {
  const draws = [190 / 397, 170 / 396, 0.99, 150 / 395, 0.99, 130 / 394, 0.99, 110 / 393, 0.99, 90 / 392, 0.99];
  let draw = 0;
  const app = await startServer(() => draws[draw++] ?? 0);
  try {
    const createdResponse = await app.fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{}" });
    const { game } = await json(createdResponse);
    app.manager.move(game.id, "up");
    for (let index = 0; index < 5; index += 1) app.manager.advance(game.id);
    app.manager.pause(game.id);

    const response = await app.fetch(`${app.baseUrl}/api/games/${game.id}/perks`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ perk: "luck" }),
    });
    const result = await json(response);
    assert.equal(response.status, 200);
    assert.equal(result.game.players[0].perks.luck.level, 1);
    assert.equal(result.game.players[0].progression.perkPoints, 0);
  } finally {
    await app.close();
  }
});

test("WebSocket sends initial and changed authoritative snapshots", async () => {
  const app = await startServer();
  let socket: WebSocket | undefined;
  try {
    const game = await app.createGame();
    const address = new URL(app.baseUrl);
    socket = new WebSocket(`ws://${address.host}/api/games/${game.id}/events`, ["retro-snake", `retro-verifier.${app.verifier}`], { headers: { cookie: app.cookie, origin: "http://localhost:5173" } });
    const firstMessage = once(socket, "message");
    await once(socket, "open");

    const initial = JSON.parse((await firstMessage)[0].toString());
    assert.equal(initial.type, "snapshot");
    assert.equal(initial.game.state.status, "ready");

    const duplicateSocket = new WebSocket(`ws://${address.host}/api/games/${game.id}/events`, ["retro-snake", `retro-verifier.${app.verifier}`], {
      headers: { cookie: app.cookie, origin: "http://localhost:5173" },
    });
    const [, duplicateResponse] = await once(duplicateSocket, "unexpected-response");
    assert.equal((duplicateResponse as import("node:http").IncomingMessage).statusCode, 503);

    const changedMessage = once(socket, "message");
    await app.fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "up" }),
    });
    const changed = JSON.parse((await changedMessage)[0].toString());
    assert.equal(changed.game.state.status, "playing");
    assert.ok(changed.game.revision > initial.game.revision);
  } finally {
    socket?.close();
    await app.close();
  }
});
