import type { GameConfig } from "./snakeConfig.ts";

export type Point = { x: number; y: number };
export type Direction = "up" | "right" | "down" | "left";
export type GameStatus = "ready" | "playing" | "paused" | "game_over" | "won";

export type GameState = {
  snake: Point[];
  direction: Direction;
  queuedDirection: Direction;
  food: Point | null;
  score: number;
  status: GameStatus;
};

const vectors: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

export function isOpposite(first: Direction, second: Direction): boolean {
  return (first === "up" && second === "down")
    || (first === "down" && second === "up")
    || (first === "left" && second === "right")
    || (first === "right" && second === "left");
}

function samePoint(first: Point, second: Point): boolean {
  return first.x === second.x && first.y === second.y;
}

export function spawnFood(snake: Point[], config: GameConfig, random: () => number = Math.random): Point | null {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const free: Point[] = [];
  for (let y = 0; y < config.gridSize; y += 1) {
    for (let x = 0; x < config.gridSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    }
  }
  return free.length === 0 ? null : free[Math.floor(random() * free.length)];
}

export function createInitialState(config: GameConfig, random: () => number = Math.random): GameState {
  const center = Math.floor(config.gridSize / 2);
  const snake = Array.from({ length: config.startingSnakeLength }, (_, index) => ({ x: center - index, y: center }));
  return {
    snake,
    direction: "right",
    queuedDirection: "right",
    food: spawnFood(snake, config, random),
    score: 0,
    status: "ready",
  };
}

export function startGame(state: GameState): GameState {
  return state.status === "ready" ? { ...state, status: "playing" } : state;
}

export function pauseGame(state: GameState): GameState {
  return state.status === "playing" ? { ...state, status: "paused" } : state;
}

export function resumeGame(state: GameState): GameState {
  return state.status === "paused" ? { ...state, status: "playing" } : state;
}

export function setDirection(state: GameState, direction: Direction): GameState {
  if (isOpposite(direction, state.direction) || isOpposite(direction, state.queuedDirection)) return state;
  return { ...state, queuedDirection: direction };
}

export function step(state: GameState, config: GameConfig, random: () => number = Math.random): GameState {
  if (state.status !== "playing") return state;

  const direction = state.queuedDirection;
  const vector = vectors[direction];
  const head = state.snake[0];
  const nextHead = { x: head.x + vector.x, y: head.y + vector.y };
  const hitsWall = nextHead.x < 0 || nextHead.y < 0 || nextHead.x >= config.gridSize || nextHead.y >= config.gridSize;
  if (hitsWall) return { ...state, direction, status: "game_over" };

  const eatsFood = state.food !== null && samePoint(nextHead, state.food);
  const bodyToCheck = eatsFood ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some((segment) => samePoint(segment, nextHead))) {
    return { ...state, direction, status: "game_over" };
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!eatsFood) nextSnake.pop();
  const nextScore = eatsFood ? state.score + config.scorePerFood : state.score;
  const nextFood = eatsFood ? spawnFood(nextSnake, config, random) : state.food;
  return {
    ...state,
    snake: nextSnake,
    direction,
    food: nextFood,
    score: nextScore,
    status: nextFood === null ? "won" : "playing",
  };
}
