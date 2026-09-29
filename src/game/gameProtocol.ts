import { parseGameConfig, type GameConfig } from "./snakeConfig.ts";
import type { Direction, GameStatus, Point } from "./snakeEngine.ts";

export type PlayerState = {
  id: string;
  snake: Point[];
  direction: Direction;
  queuedDirection: Direction;
  score: number;
};

export type GameContainerState = {
  status: GameStatus;
  food: Point | null;
};

/** State sent from the authoritative server to a browser client. */
export type GameSnapshot = {
  id: string;
  revision: number;
  config: GameConfig;
  configError: string | null;
  players: PlayerState[];
  state: GameContainerState;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPoint(value: unknown, gridSize: number): value is { x: number; y: number } {
  return isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y)
    && (value.x as number) >= 0 && (value.y as number) >= 0
    && (value.x as number) < gridSize && (value.y as number) < gridSize;
}

function isDirection(value: unknown): value is Direction {
  return value === "up" || value === "right" || value === "down" || value === "left";
}

export function validateGameSnapshot(value: unknown): GameSnapshot | null {
  const snapshotKeys = ["id", "revision", "config", "configError", "players", "state"];
  if (!isRecord(value) || Object.keys(value).some((key) => !snapshotKeys.includes(key))
    || Object.keys(value).length !== snapshotKeys.length || typeof value.id !== "string" || !value.id
    || !Number.isSafeInteger(value.revision) || (value.revision as number) < 0
    || !isRecord(value.config) || !Array.isArray(value.players) || value.players.length !== 1 || !isRecord(value.state)) return null;

  const config = value.config;
  const numericConfigKeys = ["gridSize", "startingSnakeLength", "startingSpeedMs", "speedIncreaseEvery", "speedDecreaseMs", "minimumSpeedMs", "scorePerFood"];
  if (Object.keys(config).length !== numericConfigKeys.length || numericConfigKeys.some((key) => typeof config[key] !== "number")) return null;
  const parsedConfig = parseGameConfig(config);
  if (parsedConfig.error) return null;
  const gridSize = config.gridSize as number;
  if (!Number.isInteger(gridSize) || gridSize < 1) return null;

  const state = value.state;
  const stateKeys = ["food", "status"];
  if (Object.keys(state).length !== stateKeys.length || Object.keys(state).some((key) => !stateKeys.includes(key))
    || (state.food !== null && !isPoint(state.food, gridSize))
    || !["ready", "playing", "paused", "game_over", "won"].includes(String(state.status))) return null;

  const player = value.players[0];
  const playerKeys = ["id", "snake", "direction", "queuedDirection", "score"];
  if (!isRecord(player) || Object.keys(player).length !== playerKeys.length
    || Object.keys(player).some((key) => !playerKeys.includes(key))
    || typeof player.id !== "string" || !player.id
    || !Array.isArray(player.snake) || player.snake.length < 1 || player.snake.length > gridSize * gridSize
    || !player.snake.every((point) => isPoint(point, gridSize))
    || !isDirection(player.direction) || !isDirection(player.queuedDirection)
    || typeof player.score !== "number" || !Number.isSafeInteger(player.score) || player.score < 0) return null;

  if (value.configError !== null && typeof value.configError !== "string") return null;
  return {
    id: value.id,
    revision: value.revision as number,
    config: parsedConfig.config,
    configError: value.configError as string | null,
    players: [{
      id: player.id,
      snake: player.snake as Point[],
      direction: player.direction,
      queuedDirection: player.queuedDirection,
      score: player.score,
    }],
    state: { food: state.food as Point | null, status: state.status as GameStatus },
  };
}
