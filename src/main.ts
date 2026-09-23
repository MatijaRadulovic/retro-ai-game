import "./styles.css";
import { DEFAULT_CONFIG, getTickMs, parseGameConfig } from "./game/snakeConfig.ts";
import {
  createInitialState,
  pauseGame,
  resumeGame,
  setDirection,
  startGame,
  step,
  type Direction,
  type GameState,
} from "./game/snakeEngine.ts";
import { createFakeHintModel, getGameStateSnapshot, runHintFlow } from "./ai/hint.ts";

const board = document.getElementById("board");
const gameCard = document.querySelector<HTMLElement>(".game-card");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusElement = document.getElementById("status");
const paceElement = document.getElementById("pace");
const pauseButton = document.getElementById("pause") as HTMLButtonElement | null;
const restartButton = document.getElementById("restart");
const overlay = document.getElementById("game-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayActionButton = document.getElementById("overlay-action");
const hintButton = document.getElementById("hint") as HTMLButtonElement | null;
const hintOutput = document.getElementById("hint-output");

if (!board || !gameCard || !scoreElement || !bestScoreElement || !statusElement || !paceElement || !pauseButton || !restartButton || !overlay || !overlayTitle || !overlayMessage || !overlayActionButton || !hintButton || !hintOutput) {
  throw new Error("Snake UI nije kompletno inicijalizovan.");
}

const validation = parseGameConfig(DEFAULT_CONFIG);
const config = validation.config;
const card = gameCard;
const score = scoreElement;
const bestScore = bestScoreElement;
const status = statusElement;
const pace = paceElement;
const pause = pauseButton;
const gameOverlay = overlay;
const gameOverlayTitle = overlayTitle;
const gameOverlayMessage = overlayMessage;
const gameOverlayActionButton = overlayActionButton;
const askHint = hintButton;
const hintMessage = hintOutput;
const BEST_SCORE_KEY = "retro-snake-best-score";
const cells: HTMLDivElement[] = [];

for (let index = 0; index < config.gridSize * config.gridSize; index += 1) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.setAttribute("role", "gridcell");
  cell.setAttribute("aria-hidden", "true");
  board.append(cell);
  cells.push(cell);
}

function readBestScore(): number {
  try {
    const saved = Number(window.localStorage.getItem(BEST_SCORE_KEY));
    return Number.isInteger(saved) && saved >= 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(value: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // Local persistence is optional; gameplay must work when it is unavailable.
  }
}

function replayAnimation(element: HTMLElement, className: string): void {
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
}

let state: GameState = createInitialState(config);
let displayedScore = state.score;
let best = readBestScore();
let tickTimer: number | undefined;

function cellIndex(x: number, y: number): number {
  return y * config.gridSize + x;
}

function clearScheduledTick(): void {
  if (tickTimer !== undefined) window.clearTimeout(tickTimer);
  tickTimer = undefined;
}

function scheduleTick(): void {
  clearScheduledTick();
  if (state.status !== "playing") return;
  tickTimer = window.setTimeout(() => {
    state = step(state, config);
    render(state);
    scheduleTick();
  }, getTickMs(config, state.score));
}

function render(nextState: GameState): void {
  cells.forEach((cell) => { cell.className = "cell"; });
  nextState.snake.forEach((segment, index) => {
    cells[cellIndex(segment.x, segment.y)]?.classList.add(index === 0 ? "snake-head" : "snake-body");
  });
  if (nextState.food) cells[cellIndex(nextState.food.x, nextState.food.y)]?.classList.add("food");

  if (nextState.score !== displayedScore) {
    replayAnimation(score, "score-bump");
    replayAnimation(card, "food-flash");
    displayedScore = nextState.score;
  }
  score.textContent = String(nextState.score);

  if (nextState.score > best) {
    best = nextState.score;
    persistBestScore(best);
    replayAnimation(bestScore, "best-bump");
  }
  bestScore.textContent = String(best);

  const tickMs = getTickMs(config, nextState.score);
  const speedMultiplier = (config.startingSpeedMs / tickMs).toFixed(1);
  pace.textContent = `PACE ${speedMultiplier}×`;

  const statusText = validation.error && nextState.status === "playing"
    ? "CONFIG FALLBACK"
    : nextState.status === "game_over" ? "GAME OVER"
      : nextState.status === "won" ? "BOARD CLEAR"
        : nextState.status === "paused" ? "PAUSED"
          : nextState.status === "ready" ? "READY" : "PLAYING";
  status.textContent = statusText;
  status.dataset.state = nextState.status;

  gameOverlay.hidden = nextState.status === "playing";
  gameOverlayActionButton.hidden = nextState.status === "ready";
  pause.textContent = nextState.status === "paused" ? "RESUME" : "PAUSE";
  pause.disabled = nextState.status === "ready" || nextState.status === "game_over" || nextState.status === "won";
  askHint.disabled = nextState.status !== "playing" && nextState.status !== "paused";

  if (nextState.status === "ready") {
    gameOverlayTitle.textContent = "READY?";
    gameOverlayMessage.textContent = "PRESS ANY ARROW OR TAP A DIRECTION TO START";
  } else if (nextState.status === "paused") {
    gameOverlayTitle.textContent = "PAUSED";
    gameOverlayMessage.textContent = "PRESS P, SPACE OR RESUME TO CONTINUE";
    gameOverlayActionButton.textContent = "RESUME";
  } else if (nextState.status === "game_over") {
    gameOverlayTitle.textContent = "GAME OVER";
    gameOverlayMessage.textContent = `FINAL SCORE: ${nextState.score} // PRESS R TO RESTART`;
    gameOverlayActionButton.textContent = "PLAY AGAIN";
  } else if (nextState.status === "won") {
    gameOverlayTitle.textContent = "BOARD CLEAR";
    gameOverlayMessage.textContent = `FINAL SCORE: ${nextState.score} // PERFECT RUN`;
    gameOverlayActionButton.textContent = "NEW GAME";
  }
}

function restart(): void {
  clearScheduledTick();
  state = createInitialState(config);
  displayedScore = state.score;
  hintMessage.textContent = "START A GAME TO ASK FOR A READ-ONLY HINT.";
  render(state);
}

function handleDirection(direction: Direction): void {
  if (state.status === "game_over" || state.status === "won" || state.status === "paused") return;
  const nextState = setDirection(state, direction);
  if (state.status === "ready" && nextState === state) return;
  state = startGame(nextState);
  render(state);
  scheduleTick();
}

function togglePause(): void {
  if (state.status === "playing") {
    clearScheduledTick();
    state = pauseGame(state);
    render(state);
  } else if (state.status === "paused") {
    state = resumeGame(state);
    render(state);
    scheduleTick();
  }
}

const keyDirections: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowRight: "right",
  ArrowDown: "down",
  ArrowLeft: "left",
};

window.addEventListener("keydown", (event) => {
  if (event.repeat) return;
  if (event.key.toLowerCase() === "r") {
    event.preventDefault();
    restart();
    return;
  }
  if (event.key.toLowerCase() === "p" || event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  handleDirection(direction);
});

restartButton.addEventListener("click", restart);
pause.addEventListener("click", togglePause);
gameOverlayActionButton.addEventListener("click", () => {
  if (state.status === "paused") togglePause();
  else restart();
});
askHint.addEventListener("click", async () => {
  if (state.status !== "playing" && state.status !== "paused") return;
  askHint.disabled = true;
  hintMessage.textContent = "CHECKING THE READ-ONLY GAME STATE…";
  const result = await runHintFlow(
    createFakeHintModel(),
    (detail) => getGameStateSnapshot(state, config, detail),
  );
  hintMessage.textContent = result.ok
    ? `HINT / ${result.response.urgency.toUpperCase()} — ${result.response.hint}`
    : result.message;
  render(state);
});
document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => handleDirection(button.dataset.direction as Direction));
});

render(state);
