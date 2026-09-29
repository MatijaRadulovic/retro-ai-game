import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/game/snakeConfig.ts";
import { GameSessionManager, SessionError } from "../server/gameSession.ts";

function managerFixture() {
  let id = 0;
  return new GameSessionManager(() => 0, () => `session-${++id}`);
}

test("manager creates isolated one-player game containers", () => {
  const manager = managerFixture();
  const first = manager.create();
  const second = manager.create();

  assert.notEqual(first.id, second.id);
  assert.notEqual(first.players[0].id, second.players[0].id);
  assert.equal(first.state.status, "ready");
  assert.equal(first.revision, 0);
  assert.deepEqual(first.config, second.config);
  assert.notDeepEqual(first.players[0].snake, []);
  manager.close();
});

test("valid move starts server state and advances; reverse moves are ignored", () => {
  const manager = managerFixture();
  const created = manager.create();
  const started = manager.move(created.id, "up");
  assert.equal(started.state.status, "playing");
  assert.equal(started.revision, 1);

  const reversed = manager.move(created.id, "down");
  assert.equal(reversed.players[0].queuedDirection, "up");
  assert.equal(reversed.revision, started.revision);

  const advanced = manager.advance(created.id);
  assert.deepEqual(advanced.players[0].snake[0], { x: 10, y: 9 });
  assert.ok(advanced.revision > started.revision);
  manager.close();
});

test("server schedules authoritative movement using the configured tick speed", async () => {
  const manager = managerFixture();
  const created = manager.create({ ...DEFAULT_CONFIG, startingSpeedMs: 80 });
  manager.move(created.id, "up");
  const ticked = await new Promise<ReturnType<GameSessionManager["get"]>>((resolve) => {
    const unsubscribe = manager.subscribe(created.id, (snapshot) => {
      if (snapshot.revision > 1) {
        unsubscribe();
        resolve(snapshot);
      }
    });
  });

  assert.deepEqual(ticked.players[0].snake[0], { x: 10, y: 9 });
  manager.close();
});

test("pause, resume, and restart preserve the session while resetting game state", () => {
  const manager = managerFixture();
  const created = manager.create();
  manager.move(created.id, "up");
  const paused = manager.pause(created.id);
  assert.equal(paused.state.status, "paused");
  const resumed = manager.resume(created.id);
  assert.equal(resumed.state.status, "playing");
  const restarted = manager.restart(created.id);
  assert.equal(restarted.id, created.id);
  assert.equal(restarted.players[0].id, created.players[0].id);
  assert.equal(restarted.state.status, "ready");
  assert.equal(restarted.players[0].score, 0);
  manager.close();
});

test("invalid session actions return a typed error without creating a session", () => {
  const manager = managerFixture();
  assert.throws(() => manager.pause("missing"), (error: unknown) => error instanceof SessionError && error.code === "game_not_found");
  const created = manager.create();
  assert.throws(() => manager.pause(created.id), (error: unknown) => error instanceof SessionError && error.code === "invalid_status");
  assert.equal(manager.get(created.id).revision, 0);
  manager.close();
});

test("invalid runtime config uses the existing visible safe fallback", () => {
  const manager = managerFixture();
  const created = manager.create({ gridSize: 9 });
  assert.equal(created.config.gridSize, 20);
  assert.match(created.configError ?? "", /Nevažeća konfiguracija/);
  manager.close();
});
