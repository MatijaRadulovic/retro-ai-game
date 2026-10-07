// One-shot live smoke for the Shop Strategist. Needs GEMINI_API_KEY in this terminal and AGENT_LIVE=1.
// It runs the real orchestrator against the real Google chain on an in-process game, never starts
// a server, and prints only sanitized run facts (no key, no prompt).
import { GameSessionManager } from "../../server/gameSession.ts";
import { createGoogleAgentTransport } from "../../server/agent/googleTransport.ts";
import { runAgent } from "../../server/agent/orchestrator.ts";
import { awardXp, type GameState } from "../../src/game/snakeEngine.ts";

if (process.env.AGENT_LIVE !== "1") {
  console.error("Set AGENT_LIVE=1 to run one live agent run (it uses your free-tier quota).");
  process.exit(2);
}
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set in this terminal.");
  process.exit(2);
}

const manager = new GameSessionManager();
const game = manager.create();
manager.move(game.id, "up");
manager.pause(game.id);
const session = (manager as unknown as { sessions: Map<string, { gameState: GameState }> }).sessions.get(game.id)!;
session.gameState = awardXp(session.gameState, 300);

const outcome = await runAgent({
  manager,
  gameId: game.id,
  transport: createGoogleAgentTransport(apiKey),
  deps: { telemetry: (event) => console.info(JSON.stringify(event)) },
});
console.info(JSON.stringify({
  status: outcome.status,
  stopReason: outcome.stopReason,
  steps: outcome.steps,
  toolCalls: outcome.toolCalls,
  providerAttempts: outcome.providerAttempts,
  elapsedMs: outcome.elapsedMs,
  models: outcome.log.map((entry) => entry.model),
  plan: outcome.result?.plan,
  planLine: outcome.planLine,
}, null, 2));
manager.close();
process.exit(outcome.status === "completed" ? 0 : 1);
