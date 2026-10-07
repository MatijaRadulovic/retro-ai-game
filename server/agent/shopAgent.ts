import { randomUUID } from "node:crypto";
import type { PublicAgentRun, StopReason } from "../../src/ai/shopAgent.ts";
import type { GameSessionManager } from "../gameSession.ts";
import { runAgent, type AgentDeps } from "./orchestrator.ts";
import type { AgentLimits, AgentOutcome, AgentTelemetrySink, AgentTransport } from "./types.ts";

export type ShopAgentOptions = { limits?: Partial<AgentLimits>; deps?: AgentDeps };

const SAFE_FAILURE = "ANALYSIS COULD NOT BE COMPLETED SAFELY. NO PURCHASE WAS MADE.";
const STALE_MESSAGE = "ANALYSIS RESULT IS OUT OF DATE. NO PURCHASE WAS MADE.";

export function createJsonAgentTelemetrySink(write: (line: string) => void = (line) => console.info(line)): AgentTelemetrySink {
  return (event) => write(JSON.stringify(event));
}

function toPublicRun(outcome: AgentOutcome): PublicAgentRun {
  const base = { runId: outcome.runId, revision: outcome.revision, steps: outcome.steps, toolCalls: outcome.toolCalls };
  if (outcome.status === "completed" && outcome.result) {
    return { ...base, status: "completed", result: outcome.result, message: outcome.planLine ?? "ANALYSIS COMPLETED." };
  }
  return {
    ...base,
    status: outcome.status === "failed" ? "failed" : "stopped",
    stopReason: outcome.stopReason,
    message: outcome.stopReason === "stale" ? STALE_MESSAGE : SAFE_FAILURE,
  };
}

export function createShopAgent(transport: AgentTransport | null, options: ShopAgentOptions = {}) {
  const inFlight = new Set<string>();
  const failed = (revision: number, stopReason: StopReason): PublicAgentRun => ({
    runId: (options.deps?.runId ?? randomUUID)(), status: "failed", revision, steps: 0, toolCalls: 0, stopReason, message: SAFE_FAILURE,
  });
  return {
    async run(manager: GameSessionManager, gameId: string, signal?: AbortSignal): Promise<PublicAgentRun> {
      const snapshot = manager.get(gameId);
      if (!transport || inFlight.has(gameId)) return failed(snapshot.revision, "provider_failed");
      inFlight.add(gameId);
      try {
        return toPublicRun(await runAgent({ manager, gameId, transport, limits: options.limits, deps: options.deps, signal }));
      } finally {
        inFlight.delete(gameId);
      }
    },
  };
}

export type ShopAgent = ReturnType<typeof createShopAgent>;
