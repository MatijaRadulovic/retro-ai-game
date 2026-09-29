import "./styles.css";
import { gameClient, GameApiError, connectGameEvents } from "./api/gameClient.ts";
import { getTickMs } from "./game/snakeConfig.ts";
import { validateGameSnapshot, type GameSnapshot } from "./game/gameProtocol.ts";
import { type Direction } from "./game/snakeEngine.ts";
import { createFakeHintModel, getGameStateSnapshot, runHintFlow } from "./ai/hint.ts";

const board = document.getElementById("board");
const gameCard = document.querySelector<HTMLElement>(".game-card");
const scoreElement = document.getElementById("score");
const bestScoreElement = document.getElementById("best-score");
const statusElement = document.getElementById("status");
const paceElement = document.getElementById("pace");
const connectionElement = document.getElementById("server-connection");
const pauseButton = document.getElementById("pause") as HTMLButtonElement | null;
const restartButton = document.getElementById("restart");
const overlay = document.getElementById("game-overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayMessage = document.getElementById("overlay-message");
const overlayActionButton = document.getElementById("overlay-action");
const hintButton = document.getElementById("hint") as HTMLButtonElement | null;
const hintOutput = document.getElementById("hint-output");

if (!board || !gameCard || !scoreElement || !bestScoreElement || !statusElement || !paceElement || !connectionElement || !pauseButton || !restartButton || !overlay || !overlayTitle || !overlayMessage || !overlayActionButton || !hintButton || !hintOutput) {
  throw new Error("Snake UI nije kompletno inicijalizovan.");
}

const card = gameCard;
const gameBoard = board;
const score = scoreElement;
const bestScore = bestScoreElement;
const status = statusElement;
const pace = paceElement;
const connection = connectionElement;
const pause = pauseButton;
const gameOverlay = overlay;
const gameOverlayTitle = overlayTitle;
const gameOverlayMessage = overlayMessage;
const gameOverlayActionButton = overlayActionButton;
const askHint = hintButton;
const hintMessage = hintOutput;
const BEST_SCORE_KEY = "retro-snake-best-score";
const cells: HTMLDivElement[] = [];

let game: GameSnapshot | null = null;
let displayedScore = 0;
let previousStatus = "ready";
let best = 0;
let disconnectEvents: (() => void) | undefined;

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

function cellIndex(x: number, y: number, gridSize: number): number {
  return y * gridSize + x;
}

function toSnakeState(snapshot: GameSnapshot) {
  const player = snapshot.players[0];
  return {
    snake: player.snake,
    direction: player.direction,
    queuedDirection: player.queuedDirection,
    food: snapshot.state.food,
    score: player.score,
    status: snapshot.state.status,
  };
}

function spawnParticleBurst(x: number, y: number, gridSize: number): void {
  const cell = cells[cellIndex(x, y, gridSize)];
  if (!cell) return;
  const burst = document.createElement("div");
  burst.className = "particle-burst";
  for (let i = 0; i < 6; i += 1) burst.appendChild(document.createElement("span"));
  cell.append(burst);
  window.setTimeout(() => burst.remove(), 500);
}

function applySnapshot(value: unknown): void {
  const next = validateGameSnapshot(value);
  if (!next || (game && next.id !== game.id) || (game && next.revision < game.revision)) return;
  if (!game || next.config.gridSize !== game.config.gridSize || cells.length === 0) {
    cells.splice(0, cells.length);
    gameBoard.replaceChildren();
    gameBoard.style.setProperty("--grid-size", String(next.config.gridSize));
    for (let index = 0; index < next.config.gridSize * next.config.gridSize; index += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-hidden", "true");
      gameBoard.append(cell);
      cells.push(cell);
    }
  }
  game = next;
  render(next);
}

function render(next: GameSnapshot): void {
  const state = toSnakeState(next);
  const { config } = next;
  cells.forEach((cell) => { cell.className = "cell"; });
  state.snake.forEach((segment, index) => {
    cells[cellIndex(segment.x, segment.y, config.gridSize)]?.classList.add(index === 0 ? "snake-head" : "snake-body");
  });
  if (state.food) cells[cellIndex(state.food.x, state.food.y, config.gridSize)]?.classList.add("food");

  if (state.score !== displayedScore) {
    if (state.score > displayedScore) {
      replayAnimation(score, "score-bump");
      replayAnimation(card, "food-flash");
      spawnParticleBurst(state.snake[0].x, state.snake[0].y, config.gridSize);
    }
    displayedScore = state.score;
  }
  score.textContent = String(state.score);

  if (state.score > best) {
    best = state.score;
    persistBestScore(best);
    replayAnimation(bestScore, "best-bump");
  }
  bestScore.textContent = String(best);

  if (state.status === "game_over" && previousStatus !== "game_over") replayAnimation(card, "shake");
  previousStatus = state.status;

  const tickMs = getTickMs(config, state.score);
  pace.textContent = `PACE ${(config.startingSpeedMs / tickMs).toFixed(1)}×`;
  const statusText = next.configError && state.status === "playing" ? "CONFIG FALLBACK"
    : state.status === "game_over" ? "GAME OVER"
      : state.status === "won" ? "BOARD CLEAR"
        : state.status === "paused" ? "PAUSED"
          : state.status === "ready" ? "READY" : "PLAYING";
  status.textContent = statusText;
  status.dataset.state = state.status;

  gameOverlay.hidden = state.status === "playing";
  gameOverlayActionButton.hidden = state.status === "ready";
  pause.textContent = state.status === "paused" ? "RESUME" : "PAUSE";
  pause.disabled = state.status === "ready" || state.status === "game_over" || state.status === "won";
  askHint.disabled = state.status !== "playing" && state.status !== "paused";

  if (state.status === "ready") {
    gameOverlayTitle.textContent = "READY?";
    gameOverlayMessage.textContent = "PRESS ANY ARROW OR TAP A DIRECTION TO START";
  } else if (state.status === "paused") {
    gameOverlayTitle.textContent = "PAUSED";
    gameOverlayMessage.textContent = "PRESS P, SPACE OR RESUME TO CONTINUE";
    gameOverlayActionButton.textContent = "RESUME";
  } else if (state.status === "game_over") {
    gameOverlayTitle.textContent = "GAME OVER";
    gameOverlayMessage.textContent = `FINAL SCORE: ${state.score} // PRESS R TO RESTART`;
    gameOverlayActionButton.textContent = "PLAY AGAIN";
  } else if (state.status === "won") {
    gameOverlayTitle.textContent = "BOARD CLEAR";
    gameOverlayMessage.textContent = `FINAL SCORE: ${state.score} // PERFECT RUN`;
    gameOverlayActionButton.textContent = "NEW GAME";
  }
}

function reportError(error: unknown): void {
  const message = error instanceof GameApiError ? error.message : "GAME SERVER REQUEST FAILED.";
  connection.textContent = "SERVER OFFLINE";
  connection.dataset.connection = "offline";
  status.textContent = "SERVER OFFLINE";
  status.dataset.state = "offline";
  if (!game) {
    gameOverlay.hidden = false;
    gameOverlayTitle.textContent = "SERVER UNAVAILABLE";
    gameOverlayMessage.textContent = `${message} START THE SERVER AND RELOAD.`;
    gameOverlayActionButton.hidden = true;
  }
}

async function runAction(action: () => Promise<GameSnapshot>): Promise<void> {
  try {
    applySnapshot(await action());
  } catch (error) {
    reportError(error);
  }
}

async function restart(): Promise<void> {
  if (!game) {
    await initializeGame();
    return;
  }
  displayedScore = 0;
  hintMessage.textContent = "START A GAME TO ASK FOR A READ-ONLY HINT.";
  await runAction(() => gameClient.restart(game!.id));
}

function handleDirection(direction: Direction): void {
  if (!game || (game.state.status !== "ready" && game.state.status !== "playing")) return;
  void runAction(() => gameClient.move(game!.id, direction));
}

function togglePause(): void {
  if (!game) return;
  if (game.state.status === "playing") void runAction(() => gameClient.pause(game!.id));
  else if (game.state.status === "paused") void runAction(() => gameClient.resume(game!.id));
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
    void restart();
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

restartButton.addEventListener("click", () => { void restart(); });
pause.addEventListener("click", togglePause);
gameOverlayActionButton.addEventListener("click", () => {
  if (game?.state.status === "paused") togglePause();
  else void restart();
});
askHint.addEventListener("click", async () => {
  if (!game || (game.state.status !== "playing" && game.state.status !== "paused")) return;
  askHint.disabled = true;
  hintMessage.textContent = "CHECKING THE READ-ONLY GAME STATE…";
  const current = game;
  const result = await runHintFlow(
    createFakeHintModel(),
    (detail) => getGameStateSnapshot(toSnakeState(current), current.config, detail),
  );
  hintMessage.textContent = result.ok
    ? `HINT / ${result.response.urgency.toUpperCase()} — ${result.response.hint}`
    : result.message;
  if (game) render(game);
});
document.querySelectorAll<HTMLButtonElement>("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    const direction = button.dataset.direction;
    if (direction === "up" || direction === "right" || direction === "down" || direction === "left") handleDirection(direction);
  });
});

async function initializeGame(): Promise<void> {
  connection.textContent = "CONNECTING";
  connection.dataset.connection = "connecting";
  best = readBestScore();
  try {
    const initial = await gameClient.create();
    applySnapshot(initial);
    disconnectEvents?.();
    disconnectEvents = connectGameEvents(initial.id, applySnapshot, (connected) => {
      connection.textContent = connected ? "SERVER ONLINE" : "RECONNECTING";
      connection.dataset.connection = connected ? "online" : "reconnecting";
    });
    const fresh = await gameClient.get(initial.id);
    applySnapshot(fresh);
  } catch (error) {
    reportError(error);
  }
}

window.addEventListener("beforeunload", () => disconnectEvents?.());
void initializeGame();
