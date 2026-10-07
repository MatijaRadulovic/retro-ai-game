import { randomUUID } from "node:crypto";
import { ProviderFailure, type ProviderResponse } from "./shopAdvice.ts";
import { ADVICE_MODELS, type AdviceModel } from "../../src/ai/shopAdvice.ts";
import type { GameSessionManager } from "../gameSession.ts";
import type { LifePlanContext, LifePlanResult, LifePlanStrategy, PlanEvaluation } from "../../src/ai/lifePlan.ts";
import { comparePlanEvaluations } from "../../src/ai/lifePlan.ts";
import { evaluatePlan, getLifePlanContext, validatePlanEvaluation } from "./lifePlanTools.ts";

export type LifePlanPhase = "context" | "evaluate_first" | "evaluate_second" | "final";
export type LifePlanTransport = (model: AdviceModel, prompt: string, signal: AbortSignal) => Promise<ProviderResponse>;
export type LifePlanTelemetry = {
  event: "life_plan";
  runId: string;
  stage: "provider_attempt" | "tool_call" | "run_stop";
  step: number;
  phase: LifePlanPhase;
  providerAttempt?: number;
  toolName?: "get_shop_context" | "evaluate_plan";
  status: "success" | "failure" | "completed" | "incomplete" | "unavailable" | "stale" | "cancelled";
  durationMs?: number;
  stopReason?: string;
};
export type LifePlanTelemetrySink = (event: LifePlanTelemetry) => void;
type AgentOptions = { now?: () => number; id?: () => string; attemptTimeoutMs?: number; deadlineMs?: number; wait?: (ms: number, signal?: AbortSignal) => Promise<boolean>; backoffScheduleMs?: readonly number[]; telemetry?: LifePlanTelemetrySink; jitter?: () => number; evaluateTool?: typeof evaluatePlan };
type Proposal =
  | { kind: "tool_request"; name: "get_shop_context"; arguments: Record<string, never> }
  | { kind: "tool_request"; name: "evaluate_plan"; arguments: { strategy: LifePlanStrategy; foodLimit: 100 } }
  | { kind: "final"; result: { recommendation: LifePlanStrategy | "no_recommendation"; reasonCode: string; evidenceIds: string[] } };
const strategies: LifePlanStrategy[] = ["save_for_life", "buy_extra_xp_then_save"];
function jittered(delay: number, random: () => number): number {
  if (delay <= 0) return 0;
  const sample = Math.max(0, Math.min(1, random()));
  return Math.round(delay * (0.8 + sample * 0.4));
}
function record(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function exact(value: Record<string, unknown>, keys: string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function decodeProposal(value: unknown): Proposal | null {
  if (!record(value) || typeof value.kind !== "string") return null;
  if (value.kind === "tool_request" && exact(value, ["kind", "name", "arguments"]) && record(value.arguments)) {
    if (value.name === "get_shop_context" && exact(value.arguments, [])) return value as unknown as Proposal;
    if (value.name === "evaluate_plan" && exact(value.arguments, ["strategy", "foodLimit"])
      && strategies.includes(value.arguments.strategy as LifePlanStrategy) && value.arguments.foodLimit === 100) return value as unknown as Proposal;
    return null;
  }
  if (value.kind === "final" && exact(value, ["kind", "result"]) && record(value.result)
    && exact(value.result, ["recommendation", "reasonCode", "evidenceIds"])
    && (value.result.recommendation === "no_recommendation" || strategies.includes(value.result.recommendation as LifePlanStrategy))
    && typeof value.result.reasonCode === "string" && Array.isArray(value.result.evidenceIds)
    && value.result.evidenceIds.every((id) => typeof id === "string")) return value as unknown as Proposal;
  return null;
}
function unavailable(revision: number, code: string): LifePlanResult {
  const message = code === "deadline" ? "LIFE PLAN TIMED OUT. NO PURCHASE WAS MADE."
    : code === "provider_unavailable" ? "AI SERVICE IS UNAVAILABLE. NO PURCHASE WAS MADE."
      : code === "invalid_proposal" || code === "invalid_final" || code === "invalid_tool_result"
        ? "LIFE PLAN COULD NOT BE VERIFIED. NO PURCHASE WAS MADE."
        : "LIFE PLAN IS UNAVAILABLE. NO PURCHASE WAS MADE.";
  return { status: "unavailable", revision, code, message };
}
function assumptions(): string[] { return ["RED FOOD ONLY", "NO COLLISIONS OR LIFE LOSS", "NO FUTURE LUCKY REWARDS", "NO OTHER PURCHASES", "A BOUNDED PROJECTION OF UP TO 100 FOODS; NOT A GUARANTEE."]; }
function buildPrompt(phase: LifePlanPhase, allowed: string, context: LifePlanContext | null, evaluations: PlanEvaluation[]): string {
  return [
    "You are a read-only helper for a fixed plan to the next +1 Life. The application controls all actions, limits, validation, continuation, final choice, and stopping.",
    `Current phase: ${phase}. Return exactly one JSON object matching only this allowed next proposal: ${allowed}.`,
    "Never include explanations, extra keys, multiple proposals, game IDs, revisions, formulas, or invented evidence.",
    `Shop context: ${JSON.stringify(context)}`,
    `Validated evaluations: ${JSON.stringify(evaluations)}`,
    "Tool proposal envelope: {\"kind\":\"tool_request\",\"name\":\"get_shop_context\",\"arguments\":{}} or {\"kind\":\"tool_request\",\"name\":\"evaluate_plan\",\"arguments\":{\"strategy\":\"save_for_life\",\"foodLimit\":100}}.",
    "Final envelope: {\"kind\":\"final\",\"result\":{\"recommendation\":\"save_for_life\",\"reasonCode\":\"fewer_food\",\"evidenceIds\":[\"...\"]}}.",
  ].join("\n");
}

export function validateLifePlanFinal(
  result: { recommendation: LifePlanStrategy | "no_recommendation"; reasonCode: string; evidenceIds: string[] },
  evaluations: PlanEvaluation[],
  context: LifePlanContext,
): boolean {
  const outcome = comparePlanEvaluations(evaluations);
  const extraUnavailableReason = context.extraXp.nextCost === null ? "extra_xp_capped"
    : context.perkPoints < context.extraXp.nextCost ? "insufficient_points" : null;
  const expectedReason = outcome.recommendation === "save_for_life" && extraUnavailableReason
    ? "extra_xp_unavailable" : outcome.reasonCode;
  const expectedIds = evaluations.filter((item) => item.status !== "unavailable").map((item) => item.evidenceId).sort();
  return JSON.stringify([...result.evidenceIds].sort()) === JSON.stringify(expectedIds)
    && result.recommendation === (outcome.recommendation ?? "no_recommendation")
    && result.reasonCode === expectedReason;
}

export function createJsonLifePlanTelemetrySink(write: (line: string) => void = (line) => console.info(line)): LifePlanTelemetrySink {
  return (event) => write(JSON.stringify(event));
}

export function createLifePlanAgent(transport: LifePlanTransport | null, options: AgentOptions = {}) {
  const now = options.now ?? Date.now;
  const makeId = options.id ?? randomUUID;
  const deadlineMs = Math.min(60_000, Math.max(1, options.deadlineMs ?? 60_000));
  const attemptTimeoutMs = Math.min(10_000, Math.max(1, options.attemptTimeoutMs ?? 10_000));
  const backoff = options.backoffScheduleMs ?? [1_000, 3_000, 5_000];
  const telemetry = options.telemetry ?? (() => {});
  const jitter = options.jitter ?? Math.random;
  const evaluateTool = options.evaluateTool ?? evaluatePlan;
  const wait = options.wait ?? ((ms: number, signal?: AbortSignal) => new Promise<boolean>((resolve) => {
    if (signal?.aborted) { resolve(false); return; }
    const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(true); }, ms);
    const abort = () => { clearTimeout(timer); resolve(false); };
    signal?.addEventListener("abort", abort, { once: true });
  }));
  return {
    async plan(manager: GameSessionManager, gameId: string, signal?: AbortSignal): Promise<LifePlanResult> {
      let snapshot;
      try { snapshot = manager.get(gameId); } catch { return unavailable(0, "unknown_game"); }
      const revision = snapshot.revision;
      if (snapshot.state.status !== "paused") return unavailable(revision, "not_paused");
      const context = getLifePlanContext(snapshot);
      if (!context) return unavailable(revision, "invalid_context");
      if (context.extraLife.charges >= 2) return unavailable(revision, "life_cap");
      if (context.perkPoints >= (context.extraLife.nextCost ?? Infinity)) {
        return { status: "completed", revision, source: "application", recommendation: "buy_now", reasonCode: "already_affordable", evidenceIds: [], assumptions: [], message: "YOU CAN BUY +1 LIFE NOW. NO PURCHASE WAS MADE." };
      }
      if (!transport) return unavailable(revision, "not_configured");
      if (signal?.aborted) return { status: "cancelled", revision, code: "cancelled", message: "LIFE PLAN WAS CANCELLED. NO PURCHASE WAS MADE." };
      const runId = makeId();
      const deadline = now() + deadlineMs;
      let phase: LifePlanPhase = "context";
      let currentContext: LifePlanContext | null = null;
      const evaluations: PlanEvaluation[] = [];
      const signatures = new Set<string>();
      let steps = 0;
      let tools = 0;
      let attempts = 0;
      let preferredModelIndex = 0;
      const emit = (event: LifePlanTelemetry): void => { try { telemetry(event); } catch { /* Diagnostics never change a result. */ } };
      const finish = (result: LifePlanResult, stopReason: string): LifePlanResult => {
        emit({ event: "life_plan", runId, stage: "run_stop", step: steps, phase, status: result.status, stopReason });
        return result;
      };
      const current = (): boolean => {
        if (signal?.aborted) return false;
        try { const latest = manager.get(gameId); return latest.revision === revision && latest.state.status === "paused"; } catch { return false; }
      };
      const callModel = async (prompt: string): Promise<unknown> => {
        const models = ADVICE_MODELS;
        const modelUses = new Map<AdviceModel, number>();
        let lastError: unknown;
        for (let modelIndex = preferredModelIndex; modelIndex < models.length; modelIndex += 1) {
          const model = models[modelIndex];
          const maxForModel = model === ADVICE_MODELS[0] ? 1 : model === ADVICE_MODELS[1] ? 2 : 3;
          while ((modelUses.get(model) ?? 0) < maxForModel && attempts < 6 && now() < deadline) {
            if (!current()) throw new ProviderFailure("terminal", undefined, undefined, "cancelled");
            attempts += 1;
            modelUses.set(model, (modelUses.get(model) ?? 0) + 1);
            const controller = new AbortController();
            const abort = () => controller.abort();
            signal?.addEventListener("abort", abort, { once: true });
            const remaining = Math.max(1, Math.min(attemptTimeoutMs, deadline - now()));
            const attemptStartedAt = now();
            let timeoutId: ReturnType<typeof setTimeout> | undefined;
            let timedOut = false;
            try {
              const timeout = new Promise<never>((_resolve, reject) => {
                timeoutId = setTimeout(() => {
                  timedOut = true;
                  abort();
                  reject(new ProviderFailure("transient", 408, undefined, "timeout"));
                }, remaining);
              });
              const response = await Promise.race([transport(model, prompt, controller.signal), timeout]);
              emit({ event: "life_plan", runId, stage: "provider_attempt", step: steps, phase, providerAttempt: attempts, status: "success", durationMs: Math.max(0, Math.round(now() - attemptStartedAt)) });
              preferredModelIndex = modelIndex;
              return response.value;
            } catch (error) {
              const failure = timedOut && !signal?.aborted
                ? new ProviderFailure("transient", 408, undefined, "timeout")
                : error instanceof ProviderFailure ? error : new ProviderFailure("transient", undefined, undefined, "network");
              lastError = failure;
              emit({ event: "life_plan", runId, stage: "provider_attempt", step: steps, phase, providerAttempt: attempts, status: "failure", durationMs: Math.max(0, Math.round(now() - attemptStartedAt)) });
              if (signal?.aborted || failure.errorClass === "cancelled" || failure.kind === "terminal" || failure.kind === "invalid_output") throw failure;
              if (failure.kind === "capability") break;
              const used = modelUses.get(model) ?? 0;
              if (used < maxForModel) {
                const retryAfter = failure.retryAfterMs ?? 0;
                if (retryAfter > 5_000) break;
                const delay = Math.max(jittered(backoff[Math.min(used - 1, backoff.length - 1)] ?? 5_000, jitter), retryAfter);
                if (now() + delay >= deadline || !(await wait(delay, signal))) {
                  if (signal?.aborted) throw new ProviderFailure("terminal", undefined, undefined, "cancelled");
                  break;
                }
              }
            } finally {
              if (timeoutId) clearTimeout(timeoutId);
              signal?.removeEventListener("abort", abort);
            }
          }
        }
        if (lastError instanceof Error) throw lastError;
        throw new ProviderFailure("transient", undefined, undefined, attempts >= 6 ? "provider_error" : "timeout");
      };
      try {
        while (steps < 4 && now() < deadline) {
          if (!current()) return finish(signal?.aborted
            ? { status: "cancelled", revision, code: "cancelled", message: "LIFE PLAN WAS CANCELLED. NO PURCHASE WAS MADE." }
            : { status: "stale", revision, code: "stale_revision", message: "SHOP STATE CHANGED. REQUEST A NEW PLAN." }, signal?.aborted ? "cancelled" : "stale_revision");
          steps += 1;
          const expectedStrategy: LifePlanStrategy | null = phase === "evaluate_first" ? "save_for_life"
            : phase === "evaluate_second" ? "buy_extra_xp_then_save" : null;
          const allowed = phase === "context" ? '{"kind":"tool_request","name":"get_shop_context","arguments":{}}'
            : phase === "evaluate_first" || phase === "evaluate_second"
              ? `{"kind":"tool_request","name":"evaluate_plan","arguments":{"strategy":"${expectedStrategy}","foodLimit":100}}`
              : '{"kind":"final","result":{"recommendation":"save_for_life|buy_extra_xp_then_save|no_recommendation","reasonCode":"...","evidenceIds":[...]}}';
          let raw: unknown;
          try { raw = await callModel(buildPrompt(phase, allowed, currentContext, evaluations)); }
          catch (error) {
            if (signal?.aborted || (error instanceof ProviderFailure && error.errorClass === "cancelled")) return finish({ status: "cancelled", revision, code: "cancelled", message: "LIFE PLAN WAS CANCELLED. NO PURCHASE WAS MADE." }, "cancelled");
            if (now() >= deadline) return finish(unavailable(revision, "deadline"), "deadline");
            return finish(unavailable(revision, "provider_unavailable"), "provider_failure");
          }
          const proposal = decodeProposal(raw);
          if (!proposal) return finish(unavailable(revision, "invalid_proposal"), "invalid_proposal");
          const signature = JSON.stringify([proposal.kind, "name" in proposal ? proposal.name : "final", proposal.kind === "tool_request" ? proposal.arguments : proposal.result, revision]);
          if (signatures.has(signature)) return finish(unavailable(revision, "repeated_action"), "repeated_action");
          signatures.add(signature);
          if (proposal.kind === "tool_request") {
            if (!current()) return finish(signal?.aborted
              ? { status: "cancelled", revision, code: "cancelled", message: "LIFE PLAN WAS CANCELLED. NO PURCHASE WAS MADE." }
              : { status: "stale", revision, code: "stale_revision", message: "SHOP STATE CHANGED. REQUEST A NEW PLAN." }, signal?.aborted ? "cancelled" : "stale_revision");
            if (phase === "context" && proposal.name === "get_shop_context" && tools < 3) {
              tools += 1;
              const toolStartedAt = performance.now();
              currentContext = structuredClone(context);
              if (!currentContext || JSON.stringify(currentContext) !== JSON.stringify(context)
                || Buffer.byteLength(JSON.stringify(currentContext), "utf8") > 8192
                || performance.now() - toolStartedAt > 100) {
                emit({ event: "life_plan", runId, stage: "tool_call", step: steps, phase, toolName: "get_shop_context", status: "failure", durationMs: Math.max(0, Math.round(performance.now() - toolStartedAt)) });
                return finish(unavailable(revision, "invalid_tool_result"), "invalid_tool_result");
              }
              emit({ event: "life_plan", runId, stage: "tool_call", step: steps, phase, toolName: "get_shop_context", status: "success", durationMs: Math.max(0, Math.round(performance.now() - toolStartedAt)) });
              phase = "evaluate_first";
              continue;
            }
            if ((phase === "evaluate_first" || phase === "evaluate_second") && proposal.name === "evaluate_plan"
              && proposal.arguments.strategy === expectedStrategy && proposal.arguments.foodLimit === 100 && tools < 3 && currentContext) {
              const expectedRevision = revision;
              if (!current() || expectedRevision !== revision) return { status: "stale", revision, code: "stale_revision", message: "SHOP STATE CHANGED. REQUEST A NEW PLAN." };
              tools += 1;
              const toolStartedAt = performance.now();
              let evaluation: PlanEvaluation;
              try { evaluation = evaluateTool(currentContext, expectedStrategy); }
              catch {
                emit({ event: "life_plan", runId, stage: "tool_call", step: steps, phase, toolName: "evaluate_plan", status: "failure", durationMs: Math.max(0, Math.round(performance.now() - toolStartedAt)) });
                return finish(unavailable(revision, "invalid_tool_result"), "invalid_tool_result");
              }
              if (!validatePlanEvaluation(evaluation, context, expectedStrategy)) {
                emit({ event: "life_plan", runId, stage: "tool_call", step: steps, phase, toolName: "evaluate_plan", status: "failure", durationMs: Math.max(0, Math.round(performance.now() - toolStartedAt)) });
                return finish(unavailable(revision, "invalid_tool_result"), "invalid_tool_result");
              }
              emit({ event: "life_plan", runId, stage: "tool_call", step: steps, phase, toolName: "evaluate_plan", status: "success", durationMs: Math.max(0, Math.round(performance.now() - toolStartedAt)) });
              evaluations.push(evaluation);
              if (phase === "evaluate_first") {
                const canBuyExtra = context.extraXp.nextCost !== null && context.perkPoints >= context.extraXp.nextCost;
                phase = canBuyExtra ? "evaluate_second" : "final";
              } else phase = "final";
              continue;
            }
            return finish(unavailable(revision, "wrong_phase_or_action"), "wrong_phase_or_action");
          }
          if (phase !== "final") return finish(unavailable(revision, "premature_final"), "premature_final");
          if (!validateLifePlanFinal(proposal.result, evaluations, context)) return finish(unavailable(revision, "invalid_final"), "invalid_final");
          const outcome = comparePlanEvaluations(evaluations);
          const extraUnavailableReason = context.extraXp.nextCost === null ? "extra_xp_capped"
            : context.perkPoints < context.extraXp.nextCost ? "insufficient_points" : null;
          const expectedReason = outcome.recommendation === "save_for_life" && extraUnavailableReason
            ? "extra_xp_unavailable" : outcome.reasonCode;
          const expectedIds = evaluations.filter((item) => item.status !== "unavailable").map((item) => item.evidenceId).sort();
          if (!current()) return finish({ status: "stale", revision, code: "stale_revision", message: "SHOP STATE CHANGED. REQUEST A NEW PLAN." }, "stale_revision");
          if (!outcome.recommendation) {
            const unavailableNote = extraUnavailableReason === "extra_xp_capped" ? " EXTRA XP IS AT THE LEVEL CAP."
              : extraUnavailableReason === "insufficient_points" ? " EXTRA XP IS CURRENTLY UNAFFORDABLE." : "";
            return finish({ status: "incomplete", revision, reasonCode: "none_reached", comparison: evaluations, assumptions: assumptions(), message: `NEITHER PLAN REACHES +1 LIFE WITHIN 100 RED FOODS.${unavailableNote}` }, "incomplete");
          }
          const comparison = evaluations.filter((item) => item.status !== "unavailable").map((item) => ({ evidenceId: item.evidenceId, strategy: item.strategy, status: item.status as "reached" | "not_reached_within_limit", ...(item.status === "reached" ? { foodsToGoal: item.foodsToGoal } : {}), projectedPoints: item.projectedPoints }));
          const name = outcome.recommendation === "save_for_life" ? "SAVE YOUR POINTS" : "BUY ONE EXTRA XP LEVEL, THEN SAVE";
          const unavailableNote = outcome.recommendation === "save_for_life" && extraUnavailableReason
            ? extraUnavailableReason === "extra_xp_capped" ? " EXTRA XP IS AT THE LEVEL CAP." : " EXTRA XP IS CURRENTLY UNAFFORDABLE."
            : "";
          return finish({ status: "completed", revision, source: "validated_plan", recommendation: outcome.recommendation, reasonCode: expectedReason, evidenceIds: expectedIds, comparison, assumptions: assumptions(), message: `${name}.${unavailableNote}` }, "completed");
        }
        const reason = now() >= deadline ? "deadline" : "step_limit";
        return finish(unavailable(revision, reason), reason);
      } catch {
        return finish(unavailable(revision, "internal_error"), "internal_error");
      }
    },
  };
}
export type LifePlanAgent = ReturnType<typeof createLifePlanAgent>;
