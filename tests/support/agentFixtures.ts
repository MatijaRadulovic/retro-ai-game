import { GameSessionManager } from "../../server/gameSession.ts";
import { ProviderFailure } from "../../server/ai/shopAdvice.ts";
import type { AgentStepRequest, AgentTransport } from "../../server/agent/types.ts";
import type { AdviceModel } from "../../src/ai/shopAdvice.ts";
import type { GameState } from "../../src/game/snakeEngine.ts";

type Internals = { sessions: Map<string, { gameState: GameState }> };

/** A paused shop with a chosen balance. Writes the state directly, like the e2e seed fixture. */
export function pausedGame(points: number, overrides: Partial<GameState> = {}) {
  let counter = 0;
  const manager = new GameSessionManager(() => 0, () => `fixture-${++counter}`);
  const game = manager.create();
  manager.move(game.id, "up");
  manager.pause(game.id);
  const session = (manager as unknown as Internals).sessions.get(game.id)!;
  session.gameState = { ...session.gameState, perkPoints: points, ...overrides };
  return { manager, id: game.id };
}

/** Same, but the container already has one finished game in its history. */
export function pausedGameAfterLoss(points: number) {
  let counter = 0;
  const manager = new GameSessionManager(() => 0, () => `fixture-${++counter}`);
  const game = manager.create();
  manager.move(game.id, "up");
  for (let index = 0; index < 40 && manager.get(game.id).state.status === "playing"; index += 1) manager.advance(game.id);
  manager.restart(game.id);
  manager.move(game.id, "up");
  manager.pause(game.id);
  const session = (manager as unknown as Internals).sessions.get(game.id)!;
  session.gameState = { ...session.gameState, perkPoints: points };
  return { manager, id: game.id };
}

export type ScriptItem = { value: unknown } | { fail: ProviderFailure } | { hang: true } | { run: () => unknown };

export function scripted(items: ScriptItem[]) {
  const calls: Array<{ model: AdviceModel; request: AgentStepRequest }> = [];
  const seen = { aborted: false };
  const transport: AgentTransport = async (model, request, signal) => {
    calls.push({ model, request: structuredClone(request) });
    const item = items[calls.length - 1];
    if (!item) throw new ProviderFailure("terminal", 500, undefined, "provider_error");
    if ("fail" in item) throw item.fail;
    if ("hang" in item) {
      return await new Promise<never>((_resolve, reject) => {
        const abort = () => { seen.aborted = true; reject(new Error("aborted")); };
        if (signal.aborted) abort();
        else signal.addEventListener("abort", abort, { once: true });
      });
    }
    if ("run" in item) return { value: item.run() };
    return { value: item.value };
  };
  return { transport, calls, seen };
}

export const toolRequest = (tool: unknown, args: unknown = {}): { value: unknown } => ({ value: { kind: "tool_request", tool, arguments: args } });
export const finalAnswer = (result: unknown): { value: unknown } => ({ value: { kind: "final", result } });
export const SHOP_STATE = toolRequest("get_shop_state");
export const evalPlan = (plan: unknown) => toolRequest("evaluate_perk_plan", { plan });

export function validResult(overrides: Record<string, unknown> = {}) {
  return {
    summary: "Buy Extra XP twice, then save.",
    plan: ["extra_xp"],
    evidence: [{ source: "get_shop_state", step: 1, finding: "3 points, Extra XP level 0." }],
    confidence: "medium",
    completed: true,
    ...overrides,
  };
}

export const FAST = { backoffScheduleMs: [0, 0, 0, 0, 0], wait: async () => true };
