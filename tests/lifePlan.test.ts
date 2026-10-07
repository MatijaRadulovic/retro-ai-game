import test from "node:test";
import assert from "node:assert/strict";
import type { GameSnapshot } from "../src/game/gameProtocol.ts";
import type { GameSessionManager } from "../server/gameSession.ts";
import { createLifePlanAgent, validateLifePlanFinal } from "../server/ai/lifePlan.ts";
import { ProviderFailure } from "../server/ai/shopAdvice.ts";
import { evaluatePlan, getLifePlanContext, validatePlanEvaluation } from "../server/ai/lifePlanTools.ts";
import { comparePlanEvaluations, validateLifePlanResult, type LifePlanContext, type PlanEvaluation } from "../src/ai/lifePlan.ts";
import { getLevelForXp } from "../src/game/snakeEngine.ts";

function fixture(patch: Partial<{ xp: number; level: number; perkPoints: number; extraXpLevel: number; extraLives: number }> = {}) {
  const xp = patch.xp ?? 0;
  const level = patch.level ?? 1;
  const perkPoints = patch.perkPoints ?? 0;
  const extraXpLevel = patch.extraXpLevel ?? 0;
  const extraLives = patch.extraLives ?? 0;
  const snapshot = {
    id: "private-game-id", revision: 7, config: {}, configError: null,
    state: { status: "paused", food: null, luckyPickup: null },
    players: [{ id: "private-player", score: 12, snake: [], direction: "right", queuedDirection: "right",
      progression: { xp, level, perkPoints },
      perks: { extraXp: { level: extraXpLevel, nextCost: extraXpLevel < 5 ? extraXpLevel + 1 : null }, luck: { level: 0, nextCost: 1 }, extraLife: { charges: extraLives, nextCost: extraLives === 0 ? 5 : extraLives === 1 ? 8 : null } } }],
  } as unknown as GameSnapshot;
  let reads = 0;
  const manager = { get: () => { reads += 1; return structuredClone(snapshot); } } as unknown as GameSessionManager;
  return { snapshot, manager, reads: () => reads };
}

const ctx: LifePlanContext = { xp: 0, level: 1, perkPoints: 0, extraXp: { level: 0, nextCost: 1, xpPerRedFood: 10 }, extraLife: { charges: 0, nextCost: 5 } };

test("life-plan evaluator applies authoritative level thresholds and bounded projection", () => {
  assert.equal(getLevelForXp(49), 1);
  assert.equal(getLevelForXp(50), 2);
  assert.equal(getLevelForXp(150), 3);
  const context = { ...ctx, perkPoints: 1 };
  const save = evaluatePlan(context, "save_for_life", () => "evidence-save");
  const extra = evaluatePlan(context, "buy_extra_xp_then_save", () => "evidence-extra");
  assert.equal(save.status, "reached");
  assert.equal(extra.status, "reached");
  assert.equal(extra.purchaseCostNow, 1);
  assert.equal(extra.pointsAfterPurchase, 0);
  assert.equal(extra.xpPerRedFood, 12);
  assert.equal(save.status, "reached");
  assert.equal(extra.status, "reached");
  assert.equal(save.projectedPoints, 5);
  assert.equal(save.projectedLevel, 5);
  assert.equal(validatePlanEvaluation(save, context, "save_for_life"), true);
});

test("Extra XP unavailable, life cap and 100-food boundary are explicit", () => {
  assert.deepEqual(evaluatePlan({ ...ctx, extraXp: { ...ctx.extraXp, level: 5, nextCost: null } }, "buy_extra_xp_then_save", () => "e"), {
    evidenceId: "e", strategy: "buy_extra_xp_then_save", status: "unavailable", reasonCode: "extra_xp_capped", foodLimit: 100,
  });
  const insufficient = { ...ctx, extraXp: { ...ctx.extraXp, nextCost: 1 } };
  assert.equal(evaluatePlan(insufficient, "buy_extra_xp_then_save", () => "e").status, "unavailable");
  const chargedContext = getLifePlanContext(fixture({ extraLives: 1 }).snapshot);
  assert.equal(chargedContext?.extraLife.nextCost, 8);
  const cappedContext = getLifePlanContext(fixture({ extraLives: 2 }).snapshot);
  assert.equal(cappedContext?.extraLife.nextCost, null);
  const context = { ...ctx, perkPoints: 0, xp: 0, extraLife: { charges: 1 as const, nextCost: 8 as const } };
  const result = evaluatePlan(context, "save_for_life", () => "e");
  assert.equal(result.status, "not_reached_within_limit");
  assert.equal(result.foodLimit, 100);
  const exactlyOneHundred = evaluatePlan({ ...ctx, xp: 50, level: 2 }, "save_for_life", () => "e100");
  assert.equal(exactlyOneHundred.status, "reached");
  if (exactlyOneHundred.status === "reached") assert.equal(exactlyOneHundred.foodsToGoal, 100);
});

test("deterministic comparison prefers save on a tie", () => {
  const context = { ...ctx, perkPoints: 1 };
  const first = evaluatePlan(context, "save_for_life", () => "a");
  const second = evaluatePlan(context, "buy_extra_xp_then_save", () => "b");
  assert.equal(first.status, "reached");
  assert.equal(second.status, "reached");
  if (first.status !== "reached" || second.status !== "reached") throw new Error("tie fixtures must reach");
  const tiedExtra: PlanEvaluation = { ...first, evidenceId: "b", strategy: "buy_extra_xp_then_save" };
  assert.deepEqual(comparePlanEvaluations([first, tiedExtra]), { recommendation: "save_for_life", reasonCode: "tie_save" });
  assert.equal(validateLifePlanFinal({ recommendation: "buy_extra_xp_then_save", reasonCode: "tie_save", evidenceIds: [first.evidenceId, tiedExtra.evidenceId] }, [first, tiedExtra], context), false);
  assert.equal(validateLifePlanFinal({ recommendation: "save_for_life", reasonCode: "tie_save", evidenceIds: [first.evidenceId, tiedExtra.evidenceId] }, [first, tiedExtra], context), true);
  assert.equal(second.strategy, "buy_extra_xp_then_save");
});

function fakeModelSequence(_snapshotContext: LifePlanContext) {
  const calls: string[] = [];
  const sequence: unknown[] = [
    { kind: "tool_request", name: "get_shop_context", arguments: {} },
    { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } },
    { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } },
  ];
  const transport = async (_model: string, prompt: string) => {
    calls.push(prompt);
    if (sequence.length) return { value: sequence.shift() };
    const marker = "Validated evaluations: ";
    const evidenceText = prompt.slice(prompt.indexOf(marker) + marker.length).split("\n")[0];
    const evaluations = JSON.parse(evidenceText) as import("../src/ai/lifePlan.ts").PlanEvaluation[];
    const compared = comparePlanEvaluations(evaluations);
    return { value: { kind: "final", result: { recommendation: compared.recommendation ?? "no_recommendation", reasonCode: compared.reasonCode, evidenceIds: evaluations.filter((item) => item.status !== "unavailable").map((item) => item.evidenceId) } } };
  };
  return { transport, calls };
}

test("normal run lets model propose three tools and application verifies final evidence", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 1 });
  const context = getLifePlanContext(snapshot);
  assert.ok(context);
  const { transport, calls } = fakeModelSequence(context);
  const events: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
  const agent = createLifePlanAgent(transport as never, { id: (() => { let i = 0; return () => `run-${++i}`; })(), telemetry: (event) => events.push(event) });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls.length, 4);
  assert.equal(result.status, "completed", JSON.stringify(result));
  assert.equal(result.status === "completed" && result.source, "validated_plan");
  assert.doesNotMatch(result.message, /BOUNDED PROJECTION|NOT A GUARANTEE/);
  assert.equal(events.filter((event) => event.stage === "tool_call").length, 3);
  assert.equal(events.at(-1)?.step, 4);
  assert.equal(snapshot.revision, 7);
  assert.equal(snapshot.players[0].progression.perkPoints, 1);
  assert.equal(calls.join(" ").includes("private-game-id"), false);
});

test("unknown tool proposal is rejected before execution and does not retry", async () => {
  const { manager } = fixture();
  let calls = 0;
  let toolCalls = 0;
  const agent = createLifePlanAgent(async () => { calls += 1; return { value: { kind: "tool_request", name: "delete_game", arguments: {} } }; }, {
    telemetry: (event) => { if (event.stage === "tool_call") toolCalls += 1; },
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(toolCalls, 0);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "invalid_proposal");
  assert.equal(result.message, "LIFE PLAN COULD NOT BE VERIFIED. NO PURCHASE WAS MADE.");
});

test("a known tool proposed in the wrong phase is rejected before its execution", async () => {
  const { manager } = fixture();
  let calls = 0;
  let toolCalls = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
  }, { telemetry: (event) => { if (event.stage === "tool_call") toolCalls += 1; } });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(toolCalls, 0);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "wrong_phase_or_action");
});

test("preflight already affordable and life cap make no model call", async () => {
  let calls = 0;
  const transport = async () => { calls += 1; return { value: {} }; };
  const affordable = fixture({ perkPoints: 5 });
  const cap = fixture({ perkPoints: 99, extraLives: 2 });
  const agent = createLifePlanAgent(transport);
  assert.equal((await agent.plan(affordable.manager, "private-game-id")).status, "completed");
  const capped = await agent.plan(cap.manager, "private-game-id");
  assert.equal(capped.status, "unavailable");
  assert.equal(calls, 0);
});


test("invalid exact arguments and contradictory final proposals stop safely", async () => {
  const { manager } = fixture();
  let calls = 0;
  const malformed = createLifePlanAgent(async () => {
    calls += 1;
    return { value: { kind: "tool_request", name: "get_shop_context", arguments: { gameId: "private-game-id" } } };
  });
  const invalid = await malformed.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(invalid.status, "unavailable");
  assert.equal(invalid.status === "unavailable" && invalid.code, "invalid_proposal");
});

test("extra fields in a final model proposal are rejected without retry", async () => {
  const { manager } = fixture({ perkPoints: 1 });
  let calls = 0;
  const agent = createLifePlanAgent(async (_model, prompt) => {
    calls += 1;
    const phase = /Current phase: ([a-z_]+)/.exec(prompt)?.[1];
    if (phase === "context") return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (phase === "evaluate_first") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    if (phase === "evaluate_second") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } } };
    return { value: { kind: "final", result: { recommendation: "save_for_life", reasonCode: "fewer_food", evidenceIds: ["a", "b"], extra: "not allowed" } } };
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 4);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "invalid_proposal");
});

test("transient failures share a six-attempt run budget across approved models", async () => {
  const { manager, snapshot } = fixture();
  const before = structuredClone(snapshot);
  let calls = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    throw new ProviderFailure("transient", 503);
  }, { wait: async () => true });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 6);
  assert.equal(result.status, "unavailable");
  assert.deepEqual(snapshot, before);
});

test("malformed local tool result stops before adding evidence to a later model prompt", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 1 });
  let calls = 0;
  const toolEvents: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    return { value: calls === 1
      ? { kind: "tool_request", name: "get_shop_context", arguments: {} }
      : { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
  }, {
    evaluateTool: (context, strategy) => ({ ...evaluatePlan(context, strategy), projectedPoints: 999 }),
    telemetry: (event) => { if (event.stage === "tool_call") toolEvents.push(event); },
  });
  const before = structuredClone(snapshot);
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 2);
  assert.deepEqual(toolEvents.map((event) => [event.toolName, event.status]), [["get_shop_context", "success"], ["evaluate_plan", "failure"]]);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "invalid_tool_result");
  assert.deepEqual(snapshot, before);
});

test("tool exceptions and empty results stop safely and emit a failed tool event", async () => {
  const invalidEvaluators: Array<NonNullable<Parameters<typeof createLifePlanAgent>[1]>["evaluateTool"]> = [
    () => null as never,
    (context, strategy) => evaluatePlan(context, strategy, () => "evidence".repeat(2_000)),
  ];
  for (const evaluateTool of invalidEvaluators) {
    const { manager } = fixture({ perkPoints: 1 });
    let calls = 0;
    const toolEvents: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
    const agent = createLifePlanAgent(async () => {
      calls += 1;
      return { value: calls === 1
        ? { kind: "tool_request", name: "get_shop_context", arguments: {} }
        : { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    }, { evaluateTool, telemetry: (event) => { if (event.stage === "tool_call") toolEvents.push(event); } });
    const result = await agent.plan(manager, "private-game-id");
    assert.equal(calls, 2);
    assert.equal(result.status, "unavailable");
    assert.equal(result.status === "unavailable" && result.code, "invalid_tool_result");
    assert.equal(toolEvents.at(-1)?.status, "failure");
  }
});

test("stale revision after provider response prevents context tool execution", async () => {
  const { snapshot } = fixture();
  let reads = 0;
  const manager = { get: () => {
    reads += 1;
    return structuredClone(reads >= 4 ? { ...snapshot, revision: snapshot.revision + 1 } : snapshot);
  } } as unknown as GameSessionManager;
  let calls = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(result.status, "stale");
});

test("purchase, resume and restart state changes invalidate an in-flight plan before its tool", async () => {
  const mutations: Array<[string, (snapshot: GameSnapshot) => GameSnapshot]> = [
    ["purchase", (snapshot) => ({ ...snapshot, revision: snapshot.revision + 1, players: [{ ...snapshot.players[0], progression: { ...snapshot.players[0].progression, perkPoints: 1 } }] })],
    ["resume", (snapshot) => ({ ...snapshot, revision: snapshot.revision + 1, state: { ...snapshot.state, status: "playing" } as GameSnapshot["state"] })],
    ["restart", (snapshot) => ({ ...snapshot, revision: snapshot.revision + 1, state: { ...snapshot.state, status: "ready" } as GameSnapshot["state"] })],
  ];
  for (const [name, mutate] of mutations) {
    const { snapshot } = fixture();
    let authoritative = structuredClone(snapshot);
    const manager = { get: () => structuredClone(authoritative) } as unknown as GameSessionManager;
    let calls = 0;
    let toolCalls = 0;
    const agent = createLifePlanAgent(async () => {
      calls += 1;
      authoritative = mutate(authoritative);
      return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    }, { telemetry: (event) => { if (event.stage === "tool_call") toolCalls += 1; } });
    const result = await agent.plan(manager, "private-game-id");
    assert.equal(calls, 1, `${name} should stop before another model request`);
    assert.equal(toolCalls, 0, `${name} should stop before tool execution`);
    assert.equal(result.status, "stale", name);
  }
});

test("life-plan telemetry contains only anonymous counters, tool names and safe outcomes", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 1 });
  const context = getLifePlanContext(snapshot);
  assert.ok(context);
  const { transport } = fakeModelSequence(context);
  const events: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
  const agent = createLifePlanAgent(transport as never, { telemetry: (event) => events.push(event) });
  await agent.plan(manager, "private-game-id");
  assert.equal(events.filter((event) => event.stage === "provider_attempt").length, 4);
  assert.equal(events.filter((event) => event.stage === "tool_call").length, 3);
  assert.ok(events.some((event) => event.stage === "tool_call" && event.toolName === "evaluate_plan"));
  assert.equal(events.at(-1)?.stage, "run_stop");
  assert.equal(events.at(-1)?.step, 4);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes("private-game-id"), false);
  assert.equal(serialized.includes("private-player"), false);
  assert.equal(serialized.includes("pointsAfterPurchase"), false);
});


test("per-attempt timeout and total deadline stop unresolved model work", async () => {
  const { manager } = fixture();
  let calls = 0;
  const events: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
  const agent = createLifePlanAgent(() => {
    calls += 1;
    return new Promise(() => {});
  }, { deadlineMs: 1, attemptTimeoutMs: 1, wait: async () => true, telemetry: (event) => events.push(event) });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "deadline");
  assert.equal(result.message, "LIFE PLAN TIMED OUT. NO PURCHASE WAS MADE.");
  assert.ok(calls <= 6);
  assert.equal(events.at(-1)?.stopReason, "deadline");
});

test("local result validation rejects altered projection facts", () => {
  const valid = evaluatePlan({ ...ctx, perkPoints: 1 }, "save_for_life", () => "evidence");
  assert.equal(validatePlanEvaluation(valid, { ...ctx, perkPoints: 1 }, "save_for_life"), true);
  assert.equal(validatePlanEvaluation({ ...valid, projectedPoints: 999 }, { ...ctx, perkPoints: 1 }, "save_for_life"), false);
  assert.equal(validatePlanEvaluation({ ...valid, hidden: true }, { ...ctx, perkPoints: 1 }, "save_for_life"), false);
  assert.equal(validatePlanEvaluation([], { ...ctx, perkPoints: 1 }, "save_for_life"), false);
  assert.equal(validatePlanEvaluation({ ...valid, status: "reached", foodsToGoal: "soon" }, { ...ctx, perkPoints: 1 }, "save_for_life"), false);
});

test("Extra XP unavailable path evaluates only saving and says why", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 0 });
  const context = getLifePlanContext(snapshot);
  assert.ok(context);
  const save = evaluatePlan(context, "save_for_life", () => "e-save");
  let step = 0;
  const events: import("../server/ai/lifePlan.ts").LifePlanTelemetry[] = [];
  const agent = createLifePlanAgent(async (_model, prompt) => {
    step += 1;
    if (step === 1) return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (step === 2) return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    const marker = "Validated evaluations: ";
    const actual = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split("\n")[0]) as PlanEvaluation[];
    const outcome = comparePlanEvaluations(actual);
    return { value: { kind: "final", result: { recommendation: outcome.recommendation, reasonCode: "extra_xp_unavailable", evidenceIds: actual.map((item) => item.evidenceId) } } };
  }, { telemetry: (event) => events.push(event) });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(step, 3);
  assert.equal(events.filter((event) => event.stage === "provider_attempt").length, 3);
  assert.equal(events.filter((event) => event.stage === "tool_call").length, 2);
  assert.equal(result.status, "completed");
  assert.equal(result.status === "completed" && result.reasonCode, "extra_xp_unavailable");
  assert.match(result.status === "completed" ? result.message : "", /EXTRA XP IS CURRENTLY UNAFFORDABLE/);
  assert.equal(save.status, "reached");
});

test("no strategy reaches within 100 foods returns incomplete with its verified evidence", async () => {
  const { manager, snapshot } = fixture({ xp: 150, level: 3, perkPoints: 1, extraLives: 1 });
  const before = structuredClone(snapshot);
  let calls = 0;
  const agent = createLifePlanAgent(async (_model, prompt) => {
    calls += 1;
    const phase = /Current phase: ([a-z_]+)/.exec(prompt)?.[1];
    if (phase === "context") return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (phase === "evaluate_first") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    if (phase === "evaluate_second") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } } };
    const marker = "Validated evaluations: ";
    const evaluations = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split("\n")[0]) as PlanEvaluation[];
    assert.equal(evaluations.length, 2);
    assert.ok(evaluations.every((evaluation) => evaluation.status === "not_reached_within_limit"));
    return { value: { kind: "final", result: { recommendation: "no_recommendation", reasonCode: "none_reached", evidenceIds: evaluations.map((item) => item.evidenceId) } } };
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 4);
  assert.equal(result.status, "incomplete");
  assert.equal(result.status === "incomplete" && result.reasonCode, "none_reached");
  assert.deepEqual(snapshot, before);
});

test("contradictory final proposal cannot override application comparison", async () => {
  const { manager } = fixture({ perkPoints: 1 });
  let step = 0;
  const agent = createLifePlanAgent(async () => {
    step += 1;
    if (step === 1) return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (step === 2) return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    if (step === 3) return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } } };
    return { value: { kind: "final", result: { recommendation: "buy_extra_xp_then_save", reasonCode: "invented", evidenceIds: ["fake"] } } };
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(step, 4);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "invalid_final");
});

test("terminal provider error stops without retry or fallback", async () => {
  const { manager } = fixture();
  let calls = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    throw new ProviderFailure("terminal", 401, undefined, "unauthorized");
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(result.status, "unavailable");
});

test("invalid structured provider output stops without retry or fallback", async () => {
  const { manager } = fixture();
  let calls = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    throw new ProviderFailure("invalid_output", undefined, undefined, "invalid_json");
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(result.status, "unavailable");
});

test("request cancellation aborts the active model attempt and clears the run", async () => {
  const { manager } = fixture();
  const controller = new AbortController();
  let providerSignal: AbortSignal | undefined;
  let startedResolve: (() => void) | undefined;
  const started = new Promise<void>((resolve) => { startedResolve = resolve; });
  const agent = createLifePlanAgent((_model, _prompt, signal) => new Promise((_resolve, reject) => {
    providerSignal = signal;
    startedResolve?.();
    signal.addEventListener("abort", () => reject(new ProviderFailure("terminal", undefined, undefined, "cancelled")), { once: true });
  }));
  const request = agent.plan(manager, "private-game-id", controller.signal);
  await started;
  controller.abort();
  const result = await request;
  assert.equal(result.status, "cancelled");
  assert.equal(providerSignal?.aborted, true);
});

test("repeated tool proposal is stopped before a second execution", async () => {
  const { manager } = fixture();
  let modelCalls = 0;
  const toolCalls: string[] = [];
  const agent = createLifePlanAgent(async () => {
    modelCalls += 1;
    return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
  }, { telemetry: (event) => { if (event.stage === "tool_call" && event.toolName) toolCalls.push(event.toolName); } });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(modelCalls, 2);
  assert.deepEqual(toolCalls, ["get_shop_context"]);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "repeated_action");
});

test("final proposal before the application permits final phase executes no tool", async () => {
  const { manager } = fixture();
  let toolCalls = 0;
  const agent = createLifePlanAgent(async () => ({ value: { kind: "final", result: { recommendation: "no_recommendation", reasonCode: "none_reached", evidenceIds: [] } } }), {
    telemetry: (event) => { if (event.stage === "tool_call") toolCalls += 1; },
  });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(toolCalls, 0);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "premature_final");
});

test("life-plan rejects wrong foodLimit before executing the proposed evaluator", async () => {
  const { manager } = fixture();
  let modelCalls = 0;
  let executedTools = 0;
  const agent = createLifePlanAgent(async () => {
    modelCalls += 1;
    return { value: modelCalls === 1
      ? { kind: "tool_request", name: "get_shop_context", arguments: {} }
      : { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 99 } } };
  }, { telemetry: (event) => { if (event.stage === "tool_call") executedTools += 1; } });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(modelCalls, 2);
  assert.equal(executedTools, 1); // only the valid context tool; rejected evaluator executed zero times
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "invalid_proposal");
});

test("transient primary failure falls back within the same model step and continues", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 1 });
  const context = getLifePlanContext(snapshot);
  assert.ok(context);
  const models: string[] = [];
  let finalCounter = 0;
  const agent = createLifePlanAgent(async (model, prompt) => {
    models.push(model);
    if (models.length === 1) throw new ProviderFailure("transient", 503);
    const phase = /Current phase: ([a-z_]+)/.exec(prompt)?.[1];
    if (phase === "context") return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (phase === "evaluate_first") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    if (phase === "evaluate_second") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } } };
    const marker = "Validated evaluations: ";
    const evaluations = JSON.parse(prompt.slice(prompt.indexOf(marker) + marker.length).split("\n")[0]) as PlanEvaluation[];
    const outcome = comparePlanEvaluations(evaluations);
    finalCounter += 1;
    return { value: { kind: "final", result: { recommendation: outcome.recommendation, reasonCode: outcome.reasonCode, evidenceIds: evaluations.map((item) => item.evidenceId) } } };
  }, { wait: async () => true });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(result.status, "completed");
  assert.equal(models[0], "gemini-3.8-flash");
  assert.equal(models[1], "gemini-3.5-flash-lite");
  assert.equal(models.length, 5);
  assert.equal(finalCounter, 1);
});


test("public result validator binds strategy display rows to unique run evidence", () => {
  const evaluation = evaluatePlan({ ...ctx, perkPoints: 1 }, "save_for_life", () => "evidence-1");
  assert.equal(evaluation.status, "reached");
  if (evaluation.status !== "reached") throw new Error("fixture should reach");
  const result = {
    status: "completed", revision: 7, source: "validated_plan", recommendation: "save_for_life", reasonCode: "only_save_reached",
    evidenceIds: [evaluation.evidenceId],
    comparison: [{ evidenceId: evaluation.evidenceId, strategy: evaluation.strategy, status: "reached", foodsToGoal: evaluation.foodsToGoal, projectedPoints: evaluation.projectedPoints }],
    assumptions: ["RED FOOD ONLY", "NO COLLISIONS OR LIFE LOSS", "NO FUTURE LUCKY REWARDS", "NO OTHER PURCHASES", "A BOUNDED PROJECTION OF UP TO 100 FOODS; NOT A GUARANTEE."],
    message: "SAVE. BOUNDED PROJECTION.",
  };
  assert.ok(validateLifePlanResult(result));
  assert.equal(validateLifePlanResult({ ...result, evidenceIds: ["fabricated"] }), null);
  assert.equal(validateLifePlanResult({ ...result, source: "validated_plan", recommendation: "buy_now" }), null);
  assert.ok(validateLifePlanResult({ status: "completed", revision: 7, source: "application", recommendation: "buy_now", reasonCode: "already_affordable", evidenceIds: [], assumptions: [], message: "BUY NOW." }));
});

test("comparison selects the only strategy that reaches within the limit", () => {
  const context: LifePlanContext = { xp: 150, level: 3, perkPoints: 1, extraXp: { level: 0, nextCost: 1, xpPerRedFood: 10 }, extraLife: { charges: 0, nextCost: 5 } };
  const save = evaluatePlan(context, "save_for_life", () => "save");
  const extra = evaluatePlan(context, "buy_extra_xp_then_save", () => "extra");
  assert.equal(save.status, "reached");
  assert.equal(extra.status, "not_reached_within_limit");
  assert.deepEqual(comparePlanEvaluations([save, extra]), { recommendation: "save_for_life", reasonCode: "only_save_reached" });
});

test("local tool output size limit rejects oversized evidence output", () => {
  assert.throws(() => evaluatePlan(ctx, "save_for_life", () => "x".repeat(9_000)), /exceeded limit/);
});

test("multiple model proposals in one response are rejected as malformed", async () => {
  const { manager } = fixture();
  let calls = 0;
  let tools = 0;
  const agent = createLifePlanAgent(async () => {
    calls += 1;
    return { value: [{ kind: "tool_request", name: "get_shop_context", arguments: {} }, { kind: "final", result: {} }] };
  }, { telemetry: (event) => { if (event.stage === "tool_call") tools += 1; } });
  const result = await agent.plan(manager, "private-game-id");
  assert.equal(calls, 1);
  assert.equal(tools, 0);
  assert.equal(result.status, "unavailable");
});

test("a successful Flash-Lite fallback is reused across model steps", async () => {
  const { manager } = fixture({ perkPoints: 1 });
  const calls: string[] = [];
  const agent = createLifePlanAgent(async (model, prompt) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") throw new ProviderFailure("transient", 503);
    const phase = /Current phase: ([a-z_]+)/.exec(prompt)?.[1];
    if (phase === "context") return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    if (phase === "evaluate_first") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    if (phase === "evaluate_second") return { value: { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "buy_extra_xp_then_save", foodLimit: 100 } } };
    const evaluations = JSON.parse(prompt.split("Validated evaluations: ")[1].split("\n")[0]) as PlanEvaluation[];
    const choice = comparePlanEvaluations(evaluations);
    return { value: { kind: "final", result: { recommendation: choice.recommendation, reasonCode: choice.reasonCode, evidenceIds: evaluations.map((item) => item.evidenceId) } } };
  }, { wait: async () => true });
  const result = await agent.plan(manager, "private-game-id");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite"]);
  assert.equal(result.status, "completed", JSON.stringify(result));
});

test("fallback attempts across successive phases share the six-attempt run budget", async () => {
  const { manager } = fixture({ perkPoints: 1 });
  const calls: Array<{ model: string; phase: string }> = [];
  const agent = createLifePlanAgent(async (model, prompt) => {
    const phase = /Current phase: ([a-z_]+)/.exec(prompt)?.[1] ?? "unknown";
    calls.push({ model, phase });
    if (model === "gemini-3.8-flash" || phase !== "context") throw new ProviderFailure("transient", 503);
    if (phase === "context") return { value: { kind: "tool_request", name: "get_shop_context", arguments: {} } };
    throw new Error(`Unexpected provider call in ${phase}`);
  }, { wait: async () => true, backoffScheduleMs: [0, 0, 0], jitter: () => 0 });
  const result = await agent.plan(manager, "private-game-id");
  assert.deepEqual(calls.map((call) => call.phase), ["context", "context", "evaluate_first", "evaluate_first", "evaluate_first", "evaluate_first"]);
  assert.equal(calls.length, 6);
  assert.equal(result.status, "unavailable");
  assert.equal(result.status === "unavailable" && result.code, "provider_unavailable");
  assert.equal(result.message, "AI SERVICE IS UNAVAILABLE. NO PURCHASE WAS MADE.");
});

test("primary timeout falls back to Flash-Lite and completes within one run", async () => {
  const { manager } = fixture({ perkPoints: 1 });
  const context = getLifePlanContext(fixture({ perkPoints: 1 }).snapshot);
  assert.ok(context);
  const { transport: successfulStep } = fakeModelSequence(context);
  const calls: string[] = [];
  const agent = createLifePlanAgent(async (model, prompt, signal) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") return new Promise<never>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new ProviderFailure("transient", undefined, undefined, "cancelled")), { once: true });
    });
    return successfulStep(model, prompt);
  }, { attemptTimeoutMs: 1, deadlineMs: 500, wait: async () => true });
  const result = await agent.plan(manager, "private-game-id");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite", "gemini-3.5-flash-lite"]);
  assert.equal(result.status, "completed", JSON.stringify(result));
});

test("Gemma completes the plan when both Flash models are unavailable", async () => {
  const { manager, snapshot } = fixture({ perkPoints: 1 });
  const context = getLifePlanContext(snapshot);
  assert.ok(context);
  const { transport: successfulStep } = fakeModelSequence(context);
  const calls: string[] = [];
  const agent = createLifePlanAgent(async (model, prompt) => {
    calls.push(model);
    if (model === "gemini-3.8-flash") throw new ProviderFailure("transient", 503);
    if (model === "gemini-3.5-flash-lite") throw new ProviderFailure("capability", 404);
    return successfulStep(model, prompt);
  }, { wait: async () => true });
  const result = await agent.plan(manager, "private-game-id");
  assert.deepEqual(calls, ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemma-4-26b-a4b-it", "gemma-4-26b-a4b-it", "gemma-4-26b-a4b-it", "gemma-4-26b-a4b-it"]);
  assert.equal(result.status, "completed", JSON.stringify(result));
});

test("the default and maximum total deadline are 60 seconds", async () => {
  for (const configuredDeadline of [undefined, 120_000]) {
    const { manager } = fixture({ perkPoints: 1 });
    let clock = 0;
    let calls = 0;
    const agent = createLifePlanAgent(async () => {
      calls += 1;
      clock += 30_000;
      return { value: calls === 1
        ? { kind: "tool_request", name: "get_shop_context", arguments: {} }
        : { kind: "tool_request", name: "evaluate_plan", arguments: { strategy: "save_for_life", foodLimit: 100 } } };
    }, { now: () => clock, deadlineMs: configuredDeadline });
    const result = await agent.plan(manager, "private-game-id");
    assert.equal(calls, 2);
    assert.equal(result.status === "unavailable" && result.code, "deadline");
  }
});
