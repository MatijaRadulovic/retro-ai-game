import "./styles.css";
import { gameClient, GameApiError, connectGameEvents } from "./api/gameClient.ts";
import { getTickMs } from "./game/snakeConfig.ts";
import { validateGameSnapshot, type GameSnapshot } from "./game/gameProtocol.ts";
import { type Direction } from "./game/snakeEngine.ts";

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
const adviceButton = document.getElementById("shop-advice-button") as HTMLButtonElement | null;
const adviceOutput = document.getElementById("shop-advice-output");
const agentButton = document.getElementById("shop-agent-button") as HTMLButtonElement | null;
const agentOutput = document.getElementById("shop-agent-output");
const xpValue = document.getElementById("xp-value");
const levelValue = document.getElementById("level-value");
const perkPointsValue = document.getElementById("perk-points-value");
const extraXpValue = document.getElementById("extra-xp-value");
const luckValue = document.getElementById("luck-value");
const lifeValue = document.getElementById("life-value");
const extraXpCubes = document.getElementById("extra-xp-cubes");
const luckCubes = document.getElementById("luck-cubes");
const lifeCubes = document.getElementById("life-cubes");
const shopToggle = document.getElementById("shop-toggle") as HTMLButtonElement | null;
const perkShop = document.getElementById("perk-shop");
const shopXp = document.getElementById("shop-xp");
const shopLevel = document.getElementById("shop-level");
const shopPoints = document.getElementById("shop-points");
const shopExtraXpValue = document.getElementById("shop-extra-xp-value");
const shopLuckValue = document.getElementById("shop-luck-value");
const shopLifeValue = document.getElementById("shop-life-value");
const shopExtraXpCubes = document.getElementById("shop-extra-xp-cubes");
const shopLuckCubes = document.getElementById("shop-luck-cubes");
const shopLifeCubes = document.getElementById("shop-life-cubes");
const buyExtraXp = document.getElementById("buy-extra-xp") as HTMLButtonElement | null;
const buyExtraLife = document.getElementById("buy-extra-life") as HTMLButtonElement | null;
const buyLuck = document.getElementById("buy-luck") as HTMLButtonElement | null;
const shopClose = document.getElementById("shop-close") as HTMLButtonElement | null;
const shopMessage = document.getElementById("shop-message");

if (!board || !gameCard || !scoreElement || !bestScoreElement || !statusElement || !paceElement || !connectionElement || !pauseButton || !restartButton || !overlay || !overlayTitle || !overlayMessage || !overlayActionButton || !adviceButton || !adviceOutput || !agentButton || !agentOutput || !xpValue || !levelValue || !perkPointsValue || !extraXpValue || !luckValue || !lifeValue || !extraXpCubes || !luckCubes || !lifeCubes || !shopToggle || !perkShop || !shopXp || !shopLevel || !shopPoints || !shopExtraXpValue || !shopLuckValue || !shopLifeValue || !shopExtraXpCubes || !shopLuckCubes || !shopLifeCubes || !buyExtraXp || !buyLuck || !buyExtraLife || !shopClose || !shopMessage) {
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
const askAdvice = adviceButton;
const adviceMessage = adviceOutput;
const askAgent = agentButton;
const agentMessage = agentOutput;
const AGENT_IDLE = "PLAN YOUR NEXT PERK PURCHASES WITH AI.";
const runXpValue = xpValue;
const runLevelValue = levelValue;
const runPerkPointsValue = perkPointsValue;
const runExtraXpValue = extraXpValue;
const runLuckValue = luckValue;
const runLifeValue = lifeValue;
const runExtraXpCubes = extraXpCubes;
const runLuckCubes = luckCubes;
const runLifeCubes = lifeCubes;
const toggleShopButton = shopToggle;
const shopPanel = perkShop;
const shopXpNumeric = shopXp;
const shopLevelNumeric = shopLevel;
const availableShopPoints = shopPoints;
const shopXpValue = shopExtraXpValue;
const shopLuckyValue = shopLuckValue;
const shopChargesValue = shopLifeValue;
const shopXpCubes = shopExtraXpCubes;
const shopLuckyCubes = shopLuckCubes;
const shopChargesCubes = shopLifeCubes;
const purchaseExtraXpButton = buyExtraXp;
const purchaseExtraLifeButton = buyExtraLife;
const purchaseLuckButton = buyLuck;
const closeShopButton = shopClose;
const shopStatusMessage = shopMessage;
const BEST_SCORE_KEY = "retro-snake-best-score";
const cells: HTMLDivElement[] = [];

let game: GameSnapshot | null = null;
let displayedScore = 0;
let previousStatus = "ready";
let best = 0;
let disconnectEvents: (() => void) | undefined;
let shopVisible = false;
let adviceAbort: AbortController | null = null;
let agentAbort: AbortController | null = null;

function clearAdvice(message = "ASK WHETHER TO BUY A PERK OR WAIT."): void {
  adviceAbort?.abort();
  adviceAbort = null;
  adviceMessage.textContent = message;
  agentAbort?.abort();
  agentAbort = null;
  agentMessage.textContent = AGENT_IDLE;
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
    xp: player.progression.xp,
    level: player.progression.level,
    perkPoints: player.progression.perkPoints,
    extraXpLevel: player.perks.extraXp.level,
    luckLevel: player.perks.luck.level,
    extraLives: player.perks.extraLife.charges,
    luckyPickup: snapshot.state.luckyPickup,
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

function renderCubes(element: HTMLElement, filled: number, total: number): void {
  element.replaceChildren();
  for (let index = 0; index < total; index += 1) {
    const cube = document.createElement("span");
    cube.className = index < filled ? "perk-cube filled" : "perk-cube";
    element.append(cube);
  }
}

function applySnapshot(value: unknown): void {
  const next = validateGameSnapshot(value);
  if (!next || (game && next.id !== game.id) || (game && next.revision < game.revision)) return;
  if (game && (next.revision !== game.revision || next.state.status !== "paused")) clearAdvice();
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
  const player = next.players[0];
  const { progression, perks } = player;
  const { config } = next;
  cells.forEach((cell) => { cell.className = "cell"; });
  state.snake.forEach((segment, index) => {
    cells[cellIndex(segment.x, segment.y, config.gridSize)]?.classList.add(index === 0 ? "snake-head" : "snake-body");
  });
  if (state.food) cells[cellIndex(state.food.x, state.food.y, config.gridSize)]?.classList.add("food");
  if (state.luckyPickup) cells[cellIndex(state.luckyPickup.x, state.luckyPickup.y, config.gridSize)]?.classList.add("lucky-food");

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

  runXpValue.textContent = String(progression.xp);
  runLevelValue.textContent = String(progression.level);
  runPerkPointsValue.textContent = String(progression.perkPoints);
  runExtraXpValue.textContent = `${perks.extraXp.level} / 5`;
  runLuckValue.textContent = `${perks.luck.level} / 5`;
  runLifeValue.textContent = `${perks.extraLife.charges} / 2`;
  renderCubes(runExtraXpCubes, perks.extraXp.level, 5);
  renderCubes(runLuckCubes, perks.luck.level, 5);
  renderCubes(runLifeCubes, perks.extraLife.charges, 2);
  availableShopPoints.textContent = String(progression.perkPoints);
  shopXpNumeric.textContent = String(progression.xp);
  shopLevelNumeric.textContent = String(progression.level);
  shopXpValue.textContent = `${perks.extraXp.level} / 5`;
  shopLuckyValue.textContent = `${perks.luck.level} / 5`;
  shopChargesValue.textContent = `${perks.extraLife.charges} / 2`;
  renderCubes(shopXpCubes, perks.extraXp.level, 5);
  renderCubes(shopLuckyCubes, perks.luck.level, 5);
  renderCubes(shopChargesCubes, perks.extraLife.charges, 2);
  const isPaused = state.status === "paused";
  const extraXpCost = perks.extraXp.nextCost;
  const extraLifeCost = perks.extraLife.nextCost;
  const luckCost = perks.luck.nextCost;
  purchaseExtraXpButton.textContent = extraXpCost === null ? "MAX LEVEL" : `BUY · ${extraXpCost} PT`;
  purchaseExtraLifeButton.textContent = extraLifeCost === null ? "MAX CHARGES" : `BUY · ${extraLifeCost} PT`;
  purchaseLuckButton.textContent = luckCost === null ? "MAX LEVEL" : `BUY · ${luckCost} PT`;
  purchaseExtraXpButton.disabled = !isPaused || extraXpCost === null || progression.perkPoints < extraXpCost;
  purchaseExtraLifeButton.disabled = !isPaused || extraLifeCost === null || progression.perkPoints < extraLifeCost;
  purchaseLuckButton.disabled = !isPaused || luckCost === null || progression.perkPoints < luckCost;
  toggleShopButton.disabled = state.status !== "playing" && state.status !== "paused";
  toggleShopButton.textContent = isPaused && shopVisible ? "CLOSE SHOP" : "SHOP";
  shopPanel.hidden = !isPaused || !shopVisible;

  gameOverlay.hidden = state.status === "playing" || (isPaused && shopVisible);
  gameOverlayActionButton.hidden = state.status === "ready";
  pause.textContent = state.status === "paused" ? "RESUME" : "PAUSE";
  pause.disabled = state.status === "ready" || state.status === "game_over" || state.status === "won";
  askAdvice.disabled = state.status !== "paused" || !shopVisible || adviceAbort !== null;
  askAgent.disabled = state.status !== "paused" || !shopVisible || agentAbort !== null;

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

async function runAction(action: () => Promise<GameSnapshot>): Promise<boolean> {
  try {
    applySnapshot(await action());
    return true;
  } catch (error) {
    reportError(error);
    return false;
  }
}

async function restart(): Promise<void> {
  if (!game) {
    await initializeGame();
    return;
  }
  displayedScore = 0;
  shopVisible = false;
  clearAdvice();
  await runAction(() => gameClient.restart(game!.id));
}

function handleDirection(direction: Direction): void {
  if (!game || (game.state.status !== "ready" && game.state.status !== "playing")) return;
  void runAction(() => gameClient.move(game!.id, direction));
}

async function togglePause(): Promise<void> {
  if (!game) return;
  if (game.state.status === "playing") {
    shopVisible = false;
    clearAdvice();
    await runAction(() => gameClient.pause(game!.id));
  } else if (game.state.status === "paused") {
    clearAdvice();
    if (await runAction(() => gameClient.resume(game!.id))) {
      shopVisible = false;
      if (game) render(game);
    }
  }
}

async function toggleShop(): Promise<void> {
  if (!game) return;
  if (game.state.status === "playing") {
    if (await runAction(() => gameClient.pause(game!.id))) {
      shopVisible = true;
      clearAdvice();
      if (game) render(game);
    }
  } else if (game.state.status === "paused") {
    if (shopVisible) {
      clearAdvice();
      if (await runAction(() => gameClient.resume(game!.id))) {
        shopVisible = false;
        if (game) render(game);
      }
    } else {
      shopVisible = true;
      clearAdvice();
      render(game);
    }
  }
}

async function purchasePerk(perk: "extra_xp" | "extra_life" | "luck"): Promise<void> {
  if (!game || game.state.status !== "paused") return;
  clearAdvice();
  shopStatusMessage.textContent = "";
  try {
    applySnapshot(await gameClient.purchasePerk(game.id, perk));
    shopStatusMessage.textContent = "PURCHASE APPLIED.";
  } catch (error) {
    shopStatusMessage.textContent = error instanceof GameApiError ? error.message : "PURCHASE FAILED.";
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
    void restart();
    return;
  }
  if (event.key.toLowerCase() === "p" || event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }
  if (event.key.toLowerCase() === "s") {
    event.preventDefault();
    void toggleShop();
    return;
  }
  const direction = keyDirections[event.key];
  if (!direction) return;
  event.preventDefault();
  handleDirection(direction);
});

restartButton.addEventListener("click", () => { void restart(); });
pause.addEventListener("click", togglePause);
shopToggle.addEventListener("click", () => { void toggleShop(); });
closeShopButton.addEventListener("click", () => { void togglePause(); });
buyExtraXp.addEventListener("click", () => { void purchasePerk("extra_xp"); });
buyExtraLife.addEventListener("click", () => { void purchasePerk("extra_life"); });
buyLuck.addEventListener("click", () => { void purchasePerk("luck"); });
gameOverlayActionButton.addEventListener("click", () => {
  if (game?.state.status === "paused") void togglePause();
  else void restart();
});
askAdvice.addEventListener("click", async () => {
  if (!game || game.state.status !== "paused" || !shopVisible || adviceAbort) return;
  const gameId = game.id;
  const revision = game.revision;
  const controller = new AbortController();
  adviceAbort = controller;
  askAdvice.disabled = true;
  adviceMessage.textContent = "CHECKING YOUR CURRENT SHOP OPTIONS…";
  try {
    const result = await gameClient.shopAdvice(gameId, controller.signal);
    if (controller.signal.aborted || !game || game.id !== gameId || game.revision !== revision || !shopVisible
      || game.state.status !== "paused" || result.revision !== revision) return;
    adviceMessage.textContent = result.status === "advice"
      ? `${result.message} · ${result.model === "gemini-3.8-flash" ? "GEMINI FLASH" : result.model === "gemini-3.5-flash-lite" ? "GEMINI FLASH-LITE" : "GEMMA 4"}`
      : result.message;
  } catch {
    if (!controller.signal.aborted && game?.id === gameId && game.revision === revision && shopVisible) {
      adviceMessage.textContent = "SHOP ADVICE IS UNAVAILABLE. NO PURCHASE WAS MADE.";
    }
  } finally {
    if (adviceAbort === controller) {
      adviceAbort = null;
      if (game) render(game);
    }
  }
});
askAgent.addEventListener("click", async () => {
  if (!game || game.state.status !== "paused" || !shopVisible || agentAbort) return;
  const gameId = game.id;
  const revision = game.revision;
  const controller = new AbortController();
  agentAbort = controller;
  askAgent.disabled = true;
  agentMessage.textContent = "AI ANALYSIS IN PROGRESS…";
  try {
    const run = await gameClient.shopAgent(gameId, controller.signal);
    if (controller.signal.aborted || !game || game.id !== gameId || game.revision !== revision || !shopVisible
      || game.state.status !== "paused" || run.revision !== revision) return;
    agentMessage.textContent = run.status === "completed"
      ? [run.message, run.result.summary, ...run.result.evidence.map((item) => `· ${item.finding}`)].join("\n")
      : run.message;
  } catch {
    if (!controller.signal.aborted && game?.id === gameId && game.revision === revision && shopVisible) {
      agentMessage.textContent = "SHOP STRATEGIST IS UNAVAILABLE. NO PURCHASE WAS MADE.";
    }
  } finally {
    if (agentAbort === controller) {
      agentAbort = null;
      if (game) render(game);
    }
  }
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
