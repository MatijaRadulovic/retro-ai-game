import type { GameConfig } from "../game/snakeConfig.ts";
import type { Direction, GameState, Point } from "../game/snakeEngine.ts";

export type HintDetail = "summary" | "tactical";
export type SuggestedAction = "move_up" | "move_right" | "move_down" | "move_left" | "avoid" | "collect" | "wait";
export type HintUrgency = "low" | "medium" | "high";

export type ToolCall = {
  name: "get_game_state";
  arguments: { detail: HintDetail };
};

export type GameStateSnapshot = {
  score: number;
  status: GameState["status"];
  gridSize: number;
  direction: Direction;
  snakeHead: Point;
  food: Point | null;
  nearbyObjects: Array<{ type: "food" | "wall"; direction: Direction }>;
};

export type HintResponse = {
  hint: string;
  suggestedAction: SuggestedAction;
  urgency: HintUrgency;
};

export type HintResult =
  | { ok: true; response: HintResponse; snapshot: GameStateSnapshot }
  | { ok: false; code: "invalid_request" | "tool_output_invalid" | "provider_failure" | "final_output_invalid"; message: string };

export type ReadOnlyGameStateTool = (detail: HintDetail) => unknown | Promise<unknown>;

export type HintModel = {
  proposeToolCall: () => unknown | Promise<unknown>;
  createHint: (snapshot: GameStateSnapshot) => unknown | Promise<unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isPoint(value: unknown): value is Point {
  return isRecord(value) && Number.isInteger(value.x) && Number.isInteger(value.y);
}

function isDirection(value: unknown): value is Direction {
  return value === "up" || value === "right" || value === "down" || value === "left";
}

function isSuggestedAction(value: unknown): value is SuggestedAction {
  return value === "move_up" || value === "move_right" || value === "move_down" || value === "move_left"
    || value === "avoid" || value === "collect" || value === "wait";
}

function isHintUrgency(value: unknown): value is HintUrgency {
  return value === "low" || value === "medium" || value === "high";
}

export function validateToolCall(value: unknown): ToolCall | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["name", "arguments"]) || value.name !== "get_game_state" || !isRecord(value.arguments)) {
    return null;
  }
  const args = value.arguments;
  if (!hasOnlyKeys(args, ["detail"]) || (args.detail !== "summary" && args.detail !== "tactical")) return null;
  return { name: "get_game_state", arguments: { detail: args.detail } };
}

export function validateGameStateSnapshot(value: unknown): GameStateSnapshot | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["score", "status", "gridSize", "direction", "snakeHead", "food", "nearbyObjects"])) return null;
  const score = value.score;
  const gridSize = value.gridSize;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || typeof gridSize !== "number" || !Number.isInteger(gridSize) || gridSize < 1) return null;
  if (value.status !== "ready" && value.status !== "playing" && value.status !== "paused" && value.status !== "game_over" && value.status !== "won") return null;
  if (!isDirection(value.direction) || !isPoint(value.snakeHead) || (value.food !== null && !isPoint(value.food)) || !Array.isArray(value.nearbyObjects)) return null;
  const nearbyObjects = value.nearbyObjects;
  if (!nearbyObjects.every((item) => isRecord(item) && hasOnlyKeys(item, ["type", "direction"]) && (item.type === "food" || item.type === "wall") && isDirection(item.direction))) return null;
  return value as GameStateSnapshot;
}

export function validateHintResponse(value: unknown): HintResponse | null {
  if (!isRecord(value) || !hasOnlyKeys(value, ["hint", "suggestedAction", "urgency"])) return null;
  if (typeof value.hint !== "string" || value.hint.trim().length < 4 || value.hint.length > 180) return null;
  if (!isSuggestedAction(value.suggestedAction) || !isHintUrgency(value.urgency)) return null;
  return { hint: value.hint.trim(), suggestedAction: value.suggestedAction, urgency: value.urgency };
}

function directionToward(from: Point, to: Point): Direction {
  if (Math.abs(to.x - from.x) >= Math.abs(to.y - from.y)) return to.x >= from.x ? "right" : "left";
  return to.y >= from.y ? "down" : "up";
}

function opposite(direction: Direction): Direction {
  return direction === "up" ? "down" : direction === "down" ? "up" : direction === "left" ? "right" : "left";
}

function nextHead(head: Point, direction: Direction): Point {
  if (direction === "up") return { x: head.x, y: head.y - 1 };
  if (direction === "down") return { x: head.x, y: head.y + 1 };
  return direction === "left" ? { x: head.x - 1, y: head.y } : { x: head.x + 1, y: head.y };
}

/** Returns a deliberately small, read-only snapshot. It never returns the full game state or browser data. */
export function getGameStateSnapshot(state: GameState, config: GameConfig, detail: HintDetail): GameStateSnapshot {
  const head = state.snake[0];
  const nearbyObjects: GameStateSnapshot["nearbyObjects"] = [];
  if (detail === "tactical" && state.food) nearbyObjects.push({ type: "food", direction: directionToward(head, state.food) });
  const next = nextHead(head, state.direction);
  if (next.x < 0 || next.y < 0 || next.x >= config.gridSize || next.y >= config.gridSize) {
    nearbyObjects.push({ type: "wall", direction: state.direction });
  }
  return {
    score: state.score,
    status: state.status,
    gridSize: config.gridSize,
    direction: state.direction,
    snakeHead: { ...head },
    food: state.food ? { ...state.food } : null,
    nearbyObjects,
  };
}

export async function runHintFlow(model: HintModel, tool: ReadOnlyGameStateTool): Promise<HintResult> {
  let proposal: unknown;
  try {
    proposal = await model.proposeToolCall();
  } catch {
    return { ok: false, code: "provider_failure", message: "AI HINT IS TEMPORARILY UNAVAILABLE. TRY AGAIN." };
  }

  const call = validateToolCall(proposal);
  if (!call) return { ok: false, code: "invalid_request", message: "AI REQUEST WAS BLOCKED BEFORE THE TOOL RAN." };

  let rawSnapshot: unknown;
  try {
    rawSnapshot = await tool(call.arguments.detail);
  } catch {
    return { ok: false, code: "tool_output_invalid", message: "GAME STATE COULD NOT BE VERIFIED. NO HINT SHOWN." };
  }

  const snapshot = validateGameStateSnapshot(rawSnapshot);
  if (!snapshot) return { ok: false, code: "tool_output_invalid", message: "GAME STATE COULD NOT BE VERIFIED. NO HINT SHOWN." };

  let rawResponse: unknown;
  try {
    rawResponse = await model.createHint(snapshot);
  } catch {
    return { ok: false, code: "provider_failure", message: "AI HINT IS TEMPORARILY UNAVAILABLE. TRY AGAIN." };
  }

  const response = validateHintResponse(rawResponse);
  if (!response) return { ok: false, code: "final_output_invalid", message: "AI RESPONSE FAILED VALIDATION. NO HINT SHOWN." };
  return { ok: true, response, snapshot };
}

function actionFor(direction: Direction): SuggestedAction {
  return `move_${direction}` as SuggestedAction;
}

/** Local deterministic stand-in for the provider. It is intentionally not a network client. */
export function createFakeHintModel(mode: "success" | "provider_failure" | "malformed_output" = "success"): HintModel {
  return {
    proposeToolCall: () => ({ name: "get_game_state", arguments: { detail: "tactical" } }),
    createHint: (snapshot) => {
      if (mode === "provider_failure") throw new Error("Fake provider failure");
      if (mode === "malformed_output") return { hint: 42, suggestedAction: "teleport", urgency: "now" };
      if (!snapshot.food) return { hint: "Keep the current line clear and wait for the next safe move.", suggestedAction: "wait", urgency: "low" };
      const direction = directionToward(snapshot.snakeHead, snapshot.food);
      if (direction === opposite(snapshot.direction)) {
        return { hint: "Food is behind you. Turn only after one safe perpendicular move.", suggestedAction: "avoid", urgency: "high" };
      }
      return { hint: `Food is ${direction}. Keep one clear turn before you commit.`, suggestedAction: actionFor(direction), urgency: "medium" };
    },
  };
}
