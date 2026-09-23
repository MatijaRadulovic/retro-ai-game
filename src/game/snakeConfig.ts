export type GameConfig = {
  gridSize: number;
  startingSnakeLength: number;
  startingSpeedMs: number;
  speedIncreaseEvery: number;
  speedDecreaseMs: number;
  minimumSpeedMs: number;
  scorePerFood: number;
};

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 20,
  startingSnakeLength: 3,
  startingSpeedMs: 160,
  speedIncreaseEvery: 5,
  speedDecreaseMs: 12,
  minimumSpeedMs: 80,
  scorePerFood: 1,
};

export type ConfigValidation = {
  config: GameConfig;
  error?: string;
};

function isValidConfig(value: unknown): value is GameConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return candidate.gridSize === 20
    && candidate.startingSnakeLength === 3
    && typeof candidate.startingSpeedMs === "number"
    && Number.isInteger(candidate.startingSpeedMs)
    && candidate.startingSpeedMs >= 80
    && candidate.startingSpeedMs <= 1000
    && candidate.speedIncreaseEvery === 5
    && candidate.speedDecreaseMs === 12
    && candidate.minimumSpeedMs === 80
    && candidate.scorePerFood === 1;
}

export function parseGameConfig(value: unknown): ConfigValidation {
  if (isValidConfig(value)) return { config: { ...value } };
  return {
    config: { ...DEFAULT_CONFIG },
    error: "Nevažeća konfiguracija igre — koristi se bezbedna podrazumevana konfiguracija.",
  };
}

export function validateGameConfig(value: unknown): GameConfig {
  return parseGameConfig(value).config;
}

export function getTickMs(config: GameConfig, score: number): number {
  const speedUps = Math.floor(score / config.speedIncreaseEvery);
  return Math.max(config.minimumSpeedMs, config.startingSpeedMs - speedUps * config.speedDecreaseMs);
}
