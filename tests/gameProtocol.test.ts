import test from "node:test";
import assert from "node:assert/strict";
import { GameSessionManager } from "../server/gameSession.ts";
import { validateGameSnapshot } from "../src/game/gameProtocol.ts";

test("snapshot protocol accepts authoritative snapshots and rejects malformed data", () => {
  const manager = new GameSessionManager(() => 0, () => "protocol-id");
  const snapshot = manager.create();
  assert.deepEqual(validateGameSnapshot(snapshot), snapshot);

  assert.equal(validateGameSnapshot({ ...snapshot, extra: "unexpected" }), null);
  assert.equal(validateGameSnapshot({ ...snapshot, config: { ...snapshot.config, gridSize: 9 } }), null);
  assert.equal(validateGameSnapshot({
    ...snapshot,
    players: [{ ...snapshot.players[0], snake: [{ x: -1, y: 3 }] }],
  }), null);
  manager.close();
});
