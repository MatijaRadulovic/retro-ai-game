// Backend for the browser E2E check: the real game server and advisor, with a scripted
// fake provider instead of Gemini. Never contacts Google and needs no API key.
//   FAKE_PROVIDER=fallback (default) — Flash fails with 503, Flash-Lite answers after a delay.
//   FAKE_PROVIDER=off               — no provider configured (same as a missing key).
//   E2E_SEED_PERK_POINTS=1          — the first pause of each game grants 50 XP (level 2, one perk
//                                      point), so a fresh run always has an affordable perk (M5).
import { createGameHttpServer } from "../../server/httpServer.ts";
import { GameSessionManager, type GameSnapshot } from "../../server/gameSession.ts";
import { awardXp, type GameState } from "../../src/game/snakeEngine.ts";
import {
  createJsonAdviceTelemetrySink,
  createShopAdvisor,
  ProviderFailure,
  type AdviceTransport,
} from "../../server/ai/shopAdvice.ts";
import { ADVICE_MODELS } from "../../src/ai/shopAdvice.ts";

const port = Number(process.env.PORT ?? 3001);
const answerDelayMs = Number(process.env.FAKE_ANSWER_DELAY_MS ?? 1500);

const fallbackTransport: AdviceTransport = async (model, context, signal) => {
  if (model === ADVICE_MODELS[0]) throw new ProviderFailure("transient", 503);
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, answerDelayMs);
    signal.addEventListener("abort", () => { clearTimeout(timer); reject(new Error("aborted")); }, { once: true });
  });
  const canBuyXp = context.extraXp.nextCost !== null && context.perkPoints >= context.extraXp.nextCost;
  return {
    value: canBuyXp
      ? { decision: "buy_extra_xp", reasonCode: "faster_xp" }
      : { decision: "wait", reasonCode: "cannot_afford" },
  };
};

const advisor = createShopAdvisor(process.env.FAKE_PROVIDER === "off" ? null : fallbackTransport, {
  backoffScheduleMs: [0, 0, 0, 0, 0],
  telemetry: createJsonAdviceTelemetrySink(),
});
// Test-only fixture: the real engine's awardXp keeps xp, level and perk points consistent, so the
// seeded snapshot still passes the client's protocol validation.
class SeededSessionManager extends GameSessionManager {
  private readonly seeded = new Set<string>();

  override pause(id: string): GameSnapshot {
    super.pause(id);
    if (!this.seeded.has(id)) {
      this.seeded.add(id);
      const internals = this as unknown as {
        sessions: Map<string, { gameState: GameState }>;
        publish(session: unknown): void;
      };
      const session = internals.sessions.get(id)!;
      session.gameState = awardXp(session.gameState, 50);
      internals.publish(session);
    }
    return this.get(id);
  }
}

const manager = process.env.E2E_SEED_PERK_POINTS === "1" ? new SeededSessionManager() : new GameSessionManager();
const server = createGameHttpServer(manager, advisor);
server.listen(port, "127.0.0.1", () => {
  console.log(`E2E fake-provider server listening on http://127.0.0.1:${port}`);
});
process.once("SIGTERM", () => server.close(() => process.exit(0)));
process.once("SIGINT", () => server.close(() => process.exit(0)));
