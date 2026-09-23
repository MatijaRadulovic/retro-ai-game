import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG } from "../src/game/snakeConfig.ts";
import { createInitialState, startGame } from "../src/game/snakeEngine.ts";
import {
  createFakeHintModel,
  getGameStateSnapshot,
  runHintFlow,
  type HintModel,
} from "../src/ai/hint.ts";

function activeSnapshot() {
  return getGameStateSnapshot(startGame(createInitialState(DEFAULT_CONFIG, () => 0)), DEFAULT_CONFIG, "tactical");
}

test("valid AI hint request executes the read-only tool once and returns a validated response", async () => {
  let callCount = 0;
  const result = await runHintFlow(createFakeHintModel(), (detail) => {
    callCount += 1;
    assert.equal(detail, "tactical");
    return activeSnapshot();
  });

  assert.equal(callCount, 1);
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.response.hint, /Food is/);
});

test("get_game_state exposes no body data and does not mutate the game", () => {
  const state = startGame(createInitialState(DEFAULT_CONFIG, () => 0));
  const before = structuredClone(state);
  const snapshot = getGameStateSnapshot(state, DEFAULT_CONFIG, "tactical");

  assert.deepEqual(state, before);
  assert.equal("snake" in snapshot, false);
  assert.deepEqual(Object.keys(snapshot).sort(), ["direction", "food", "gridSize", "nearbyObjects", "score", "snakeHead", "status"]);
});

test("invalid arguments are blocked before the tool executes", async () => {
  let callCount = 0;
  const model: HintModel = {
    proposeToolCall: () => ({ name: "get_game_state", arguments: { detail: "everything", executeCode: "nope" } }),
    createHint: () => ({ hint: "Should not run", suggestedAction: "wait", urgency: "low" }),
  };
  const result = await runHintFlow(model, () => { callCount += 1; return activeSnapshot(); });

  assert.equal(callCount, 0);
  assert.deepEqual(result, { ok: false, code: "invalid_request", message: "AI REQUEST WAS BLOCKED BEFORE THE TOOL RAN." });
});

test("unsupported tool names are blocked before the tool executes", async () => {
  let callCount = 0;
  const model: HintModel = {
    proposeToolCall: () => ({ name: "reset_game", arguments: { detail: "tactical" } }),
    createHint: () => ({ hint: "Should not run", suggestedAction: "wait", urgency: "low" }),
  };
  const result = await runHintFlow(model, () => { callCount += 1; return activeSnapshot(); });

  assert.equal(callCount, 0);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "invalid_request");
});

test("a malformed read-only tool result cannot become a hint", async () => {
  const result = await runHintFlow(createFakeHintModel(), () => ({ score: "not a number" }));

  assert.deepEqual(result, { ok: false, code: "tool_output_invalid", message: "GAME STATE COULD NOT BE VERIFIED. NO HINT SHOWN." });
});

test("provider failure returns a controlled safe error", async () => {
  const result = await runHintFlow(createFakeHintModel("provider_failure"), () => activeSnapshot());

  assert.deepEqual(result, { ok: false, code: "provider_failure", message: "AI HINT IS TEMPORARILY UNAVAILABLE. TRY AGAIN." });
});

test("a malformed final response is rejected instead of being shown", async () => {
  const result = await runHintFlow(createFakeHintModel("malformed_output"), () => activeSnapshot());

  assert.deepEqual(result, { ok: false, code: "final_output_invalid", message: "AI RESPONSE FAILED VALIDATION. NO HINT SHOWN." });
});
