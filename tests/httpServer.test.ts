import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createGameHttpServer } from "../server/httpServer.ts";
import { GameSessionManager } from "../server/gameSession.ts";

async function startServer() {
  let id = 0;
  const manager = new GameSessionManager(() => 0, () => `api-${++id}`);
  const server = createGameHttpServer(manager);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    manager,
    server,
    baseUrl,
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
    const firstResponse = await fetch(`${app.baseUrl}/api/games`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const first = (await json(firstResponse)).game;
    const secondResponse = await fetch(`${app.baseUrl}/api/games`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const second = (await json(secondResponse)).game;
    assert.equal(firstResponse.status, 201);
    assert.notEqual(first.id, second.id);
    assert.equal(first.players[0].id, "api-2");

    const getResponse = await fetch(`${app.baseUrl}/api/games/${first.id}`);
    assert.equal(getResponse.status, 200);
    assert.equal((await json(getResponse)).game.id, first.id);

    const moveResponse = await fetch(`${app.baseUrl}/api/games/${first.id}/move`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "up" }),
    });
    assert.equal((await json(moveResponse)).game.state.status, "playing");

    const pauseResponse = await fetch(`${app.baseUrl}/api/games/${first.id}/pause`, { method: "POST" });
    assert.equal((await json(pauseResponse)).game.state.status, "paused");
    const resumeResponse = await fetch(`${app.baseUrl}/api/games/${first.id}/resume`, { method: "POST" });
    assert.equal((await json(resumeResponse)).game.state.status, "playing");
    const restartResponse = await fetch(`${app.baseUrl}/api/games/${first.id}/restart`, { method: "POST" });
    assert.equal((await json(restartResponse)).game.state.status, "ready");
    assert.equal(app.manager.get(second.id).state.status, "ready");
  } finally {
    await app.close();
  }
});

test("HTTP API rejects malformed requests and missing game IDs safely", async () => {
  const app = await startServer();
  try {
    const badJson = await fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{" });
    assert.equal(badJson.status, 400);
    assert.equal((await json(badJson)).error.code, "invalid_json");

    const created = await fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{}" });
    const { game } = await json(created);
    const invalidMove = await fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ direction: "teleport" }),
    });
    assert.equal(invalidMove.status, 400);
    assert.equal((await json(invalidMove)).error.code, "invalid_move");

    const missing = await fetch(`${app.baseUrl}/api/games/unknown`);
    assert.equal(missing.status, 404);
    assert.equal((await json(missing)).error.code, "game_not_found");
    assert.equal(app.manager.get(game.id).revision, 0);
  } finally {
    await app.close();
  }
});

test("WebSocket sends initial and changed authoritative snapshots", async () => {
  const app = await startServer();
  let socket: WebSocket | undefined;
  try {
    const response = await fetch(`${app.baseUrl}/api/games`, { method: "POST", body: "{}" });
    const { game } = await json(response);
    const address = new URL(app.baseUrl);
    socket = new WebSocket(`ws://${address.host}/api/games/${game.id}/events`);
    const firstMessage = once(socket, "message");
    await once(socket, "open");

    const initial = JSON.parse((await firstMessage)[0].toString());
    assert.equal(initial.type, "snapshot");
    assert.equal(initial.game.state.status, "ready");

    const changedMessage = once(socket, "message");
    await fetch(`${app.baseUrl}/api/games/${game.id}/move`, {
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
