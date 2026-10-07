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
  xp: number;
  level: number;
  perkPoints: number;
  extraXpLevel: number;
  luckLevel: number;
  extraLives: number;
  luckyPickup: Point | null;
  status: GameStatus;
};

export type PerkType = "extra_xp" | "extra_life" | "luck";
export type PerkPurchaseResult =
  | { ok: true; state: GameState }
  | { ok: false; error: "invalid_status" | "insufficient_perk_points" | "perk_at_cap" };

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

export function getLevelForXp(xp: number): number {
  let level = 1;
  while (25 * level * (level + 1) <= xp) level += 1;
  return level;
}

export function getExtraXpPerkCost(level: number): number | null {
  return Number.isSafeInteger(level) && level >= 0 && level < 5 ? level + 1 : null;
}

export function getExtraLifePerkCost(charges: number): 5 | 8 | null {
  return charges === 0 ? 5 : charges === 1 ? 8 : null;
}

export function getRedFoodXp(extraXpLevel: number): number {
  return Number.isSafeInteger(extraXpLevel) && extraXpLevel >= 0 && extraXpLevel <= 5 ? 10 + 2 * extraXpLevel : 10;
}

export function awardXp(state: GameState, amount: number): GameState {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(state.xp + amount)) return state;
  const xp = state.xp + amount;
  const level = getLevelForXp(xp);
  return { ...state, xp, level, perkPoints: state.perkPoints + level - state.level };
}

export function purchasePerk(state: GameState, perk: PerkType): PerkPurchaseResult {
  if (state.status !== "paused") return { ok: false, error: "invalid_status" };
  const atCap = perk === "extra_xp" ? state.extraXpLevel >= 5 : perk === "luck" ? state.luckLevel >= 5 : state.extraLives >= 2;
  if (atCap) return { ok: false, error: "perk_at_cap" };
  const cost = perk === "extra_xp" ? getExtraXpPerkCost(state.extraXpLevel)! : perk === "luck" ? state.luckLevel + 1 : getExtraLifePerkCost(state.extraLives)!;
  if (state.perkPoints < cost) return { ok: false, error: "insufficient_perk_points" };
  return {
    ok: true,
    state: perk === "extra_xp"
      ? { ...state, extraXpLevel: state.extraXpLevel + 1, perkPoints: state.perkPoints - cost }
      : perk === "luck"
        ? { ...state, luckLevel: state.luckLevel + 1, perkPoints: state.perkPoints - cost }
        : { ...state, extraLives: state.extraLives + 1, perkPoints: state.perkPoints - cost },
  };
}

export function getLuckySpawnChance(luckLevel: number): number {
  return Math.round((0.05 + Math.max(0, Math.min(5, Math.floor(luckLevel))) * 0.05) * 100) / 100;
}

export function spawnFood(snake: Point[], config: GameConfig, random: () => number = Math.random, additionallyOccupied: Array<Point | null> = []): Point | null {
  const occupied = new Set([...snake, ...additionallyOccupied.filter((point): point is Point => point !== null)].map((point) => `${point.x},${point.y}`));
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
    xp: 0,
    level: 1,
    perkPoints: 0,
    extraXpLevel: 0,
    luckLevel: 0,
    extraLives: 0,
    luckyPickup: null,
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
  if (hitsWall) return collide(state, config, direction, random);

  const eatsFood = state.food !== null && samePoint(nextHead, state.food);
  const bodyToCheck = eatsFood ? state.snake : state.snake.slice(0, -1);
  if (bodyToCheck.some((segment) => samePoint(segment, nextHead))) {
    return collide(state, config, direction, random);
  }

  const nextSnake = [nextHead, ...state.snake];
  if (!eatsFood) nextSnake.pop();
  const nextScore = eatsFood ? state.score + config.scorePerFood : state.score;
  const eatsLucky = state.luckyPickup !== null && samePoint(nextHead, state.luckyPickup);
  const nextFood = eatsFood ? spawnFood(nextSnake, config, random, [state.luckyPickup]) : state.food;
  const progression = eatsFood ? awardXp(state, getRedFoodXp(state.extraXpLevel)) : state;
  let luckyPickup = eatsLucky ? null : state.luckyPickup;
  let perkPoints = progression.perkPoints + (eatsLucky ? 1 : 0);
  if (eatsFood && luckyPickup === null && nextFood !== null && random() < getLuckySpawnChance(state.luckLevel)) {
    luckyPickup = spawnFood(nextSnake, config, random, [nextFood]);
  }
  return {
    ...state,
    ...progression,
    snake: nextSnake,
    direction,
    food: nextFood,
    luckyPickup,
    perkPoints,
    score: nextScore,
    status: nextFood === null ? "won" : "playing",
  };
}

function collide(state: GameState, config: GameConfig, direction: Direction, random: () => number): GameState {
  if (state.extraLives <= 0) return { ...state, direction, status: "game_over" };
  const center = Math.floor(config.gridSize / 2);
  const snake = Array.from({ length: config.startingSnakeLength }, (_, index) => ({ x: center - index, y: center }));
  const luckyPickup = state.luckyPickup && !snake.some((segment) => samePoint(segment, state.luckyPickup!)) ? state.luckyPickup : null;
  const food = state.food && !snake.some((segment) => samePoint(segment, state.food!)) && !(luckyPickup && samePoint(luckyPickup, state.food))
    ? state.food
    : spawnFood(snake, config, random, [luckyPickup]);
  const nextLuckyPickup = state.luckyPickup && luckyPickup === null && food !== null
    ? spawnFood(snake, config, random, [food]) : luckyPickup;
  return {
    ...state,
    snake,
    direction: "right",
    queuedDirection: "right",
    food,
    luckyPickup: nextLuckyPickup,
    extraLives: state.extraLives - 1,
    status: food === null ? "won" : "playing",
  };
}
