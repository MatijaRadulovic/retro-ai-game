import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG, getTickMs, parseGameConfig, validateGameConfig } from "../src/game/snakeConfig.ts";
import { createInitialState, pauseGame, resumeGame, setDirection, startGame, step } from "../src/game/snakeEngine.ts";

test("runtime config accepts the default and explicitly falls back when invalid", () => {
  assert.deepEqual(validateGameConfig(DEFAULT_CONFIG), DEFAULT_CONFIG);
  const invalid = parseGameConfig({ gridSize: 9 });
  assert.deepEqual(invalid.config, DEFAULT_CONFIG);
  assert.match(invalid.error ?? "", /Nevažeća konfiguracija/);
});

test("initial snake has three segments and food is outside its body", () => {
  const state = createInitialState(DEFAULT_CONFIG, () => 0);
  assert.equal(state.snake.length, 3);
  assert.ok(state.food);
  assert.equal(state.snake.some((segment) => segment.x === state.food?.x && segment.y === state.food?.y), false);
});

test("new game waits for a valid direction before movement starts", () => {
  const state = createInitialState(DEFAULT_CONFIG, () => 0);
  assert.equal(state.status, "ready");
  assert.deepEqual(step(state, DEFAULT_CONFIG), state);
  assert.equal(startGame(setDirection(state, "up")).status, "playing");
});

test("pause freezes the game until it is resumed", () => {
  const playing = startGame(createInitialState(DEFAULT_CONFIG, () => 0));
  const paused = pauseGame(playing);
  assert.equal(paused.status, "paused");
  assert.deepEqual(step(paused, DEFAULT_CONFIG), paused);
  assert.equal(resumeGame(paused).status, "playing");
});

test("speed increases after each configured score milestone without crossing the safe minimum", () => {
  assert.equal(getTickMs(DEFAULT_CONFIG, 0), 160);
  assert.equal(getTickMs(DEFAULT_CONFIG, 5), 148);
  assert.equal(getTickMs(DEFAULT_CONFIG, 500), 80);
});

test("opposite direction is rejected", () => {
  const state = startGame(createInitialState(DEFAULT_CONFIG, () => 0));
  const next = setDirection(state, "left");
  assert.equal(next.queuedDirection, "right");
});

test("eating food increases score and snake length", () => {
  const state = startGame({
    ...createInitialState(DEFAULT_CONFIG, () => 0),
    food: { x: 11, y: 10 },
  });
  const next = step(state, DEFAULT_CONFIG, () => 0);
  assert.equal(next.score, 1);
  assert.equal(next.snake.length, 4);
  assert.ok(next.food);
  assert.equal(next.snake.some((segment) => segment.x === next.food?.x && segment.y === next.food?.y), false);
});

test("wall collision ends the game", () => {
  const state = startGame({
    ...createInitialState(DEFAULT_CONFIG, () => 0),
    snake: [{ x: 19, y: 10 }, { x: 18, y: 10 }, { x: 17, y: 10 }],
    direction: "right",
    queuedDirection: "right",
  });
  assert.equal(step(state, DEFAULT_CONFIG).status, "game_over");
});

test("self collision ends the game", () => {
  const state = startGame({
    ...createInitialState(DEFAULT_CONFIG, () => 0),
    snake: [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }],
    direction: "down",
    queuedDirection: "down",
    food: { x: 10, y: 10 },
  });
  assert.equal(step(state, DEFAULT_CONFIG).status, "game_over");
});
