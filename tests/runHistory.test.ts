import test from "node:test";
import assert from "node:assert/strict";
import { GameSessionManager } from "../server/gameSession.ts";

function manager() {
  let id = 0;
  return new GameSessionManager(() => 0, () => `history-${++id}`);
}

function playUntilGameOver(m: GameSessionManager, id: string): void {
  m.move(id, "up");
  for (let index = 0; index < 40 && m.get(id).state.status === "playing"; index += 1) m.advance(id);
  assert.equal(m.get(id).state.status, "game_over");
}

test("a fresh container has no history", () => {
  const m = manager();
  const game = m.create();
  assert.deepEqual(m.getRunHistory(game.id), []);
  m.close();
});

test("game over is recorded once with final score, level and perks", () => {
  const m = manager();
  const game = m.create();
  playUntilGameOver(m, game.id);
  const history = m.getRunHistory(game.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].endedBy, "game_over");
  assert.equal(history[0].level, 1);
  assert.deepEqual(history[0].perksAtEnd, { extraXp: 0, luck: 0, extraLife: 0 });
  m.restart(game.id);
  assert.equal(m.getRunHistory(game.id).length, 1);
  m.close();
});

test("restarting a game in progress records a restart; restarting a ready game does not", () => {
  const m = manager();
  const game = m.create();
  m.restart(game.id);
  assert.equal(m.getRunHistory(game.id).length, 0);
  m.move(game.id, "up");
  m.pause(game.id);
  m.restart(game.id);
  const history = m.getRunHistory(game.id);
  assert.equal(history.length, 1);
  assert.equal(history[0].endedBy, "restart");
  m.close();
});

test("history keeps the newest five entries and returns copies", () => {
  const m = manager();
  const game = m.create();
  for (let index = 0; index < 7; index += 1) {
    m.move(game.id, "up");
    m.pause(game.id);
    m.restart(game.id);
  }
  const history = m.getRunHistory(game.id);
  assert.equal(history.length, 5);
  history[0].score = 999;
  assert.equal(m.getRunHistory(game.id)[0].score, 0);
  m.close();
});

test("history is isolated per game container", () => {
  const m = manager();
  const first = m.create();
  const second = m.create();
  m.move(first.id, "up");
  m.pause(first.id);
  m.restart(first.id);
  assert.equal(m.getRunHistory(first.id).length, 1);
  assert.equal(m.getRunHistory(second.id).length, 0);
  m.close();
});
