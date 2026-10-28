import test from "node:test";
import assert from "node:assert/strict";
import { createFakeClock } from "./helpers/securityFixtures.ts";
import { SessionStore } from "../server/security/sessionStore.ts";
import { GameSessionManager } from "../server/gameSession.ts";

function deterministicRandom() {
  let value = 0;
  return (bytes: number) => Buffer.alloc(bytes, ++value);
}

test("session store hashes cookie tokens, verifies requests, expires idle records, and enforces issuance bounds", () => {
  const clock = createFakeClock(1_000);
  const store = new SessionStore({ now: clock.now, randomBytes: deterministicRandom() });
  const issued = store.create();
  assert.notEqual(issued.token, issued.verifier);
  assert.deepEqual(store.authorize(issued.token, issued.verifier), { scopeId: issued.scopeId });
  assert.equal(store.authorize(issued.token, "wrong"), null);
  assert.equal(store.hasRawToken(issued.token), false);
  clock.advance(30 * 60_000 + 1);
  assert.equal(store.authorize(issued.token, issued.verifier), null);
  assert.equal(store.activeCount, 0);
});

test("session store permits 100 live sessions and at most 20 issuances per rolling minute", () => {
  const clock = createFakeClock(10_000);
  const store = new SessionStore({ now: clock.now, randomBytes: deterministicRandom() });
  for (let index = 0; index < 20; index += 1) store.create();
  assert.throws(() => store.create(), /session_rate_limited/);
  for (let index = 20; index < 100; index += 1) {
    if (index % 20 === 0) clock.advance(60_001);
    store.create();
  }
  assert.equal(store.activeCount, 100);
  assert.throws(() => store.create(), /session_capacity_exhausted/);
});

test("session store enforces absolute lifetime independently from idle activity", () => {
  const clock = createFakeClock(5_000);
  const store = new SessionStore({ now: clock.now, randomBytes: deterministicRandom() });
  const issued = store.create();
  for (let index = 0; index < 16; index += 1) {
    clock.advance(29 * 60_000);
    assert.ok(store.authorize(issued.token, issued.verifier));
  }
  clock.advance(16 * 60_000 + 1);
  assert.equal(store.authorize(issued.token, issued.verifier), null);
});

test("session expiry destroys every game in the expired scope without exposing owner metadata", () => {
  const clock = createFakeClock(2_000);
  const manager = new GameSessionManager(() => 0, (() => { let id = 0; return () => `owned-${++id}`; })());
  const store = new SessionStore({ now: clock.now, randomBytes: deterministicRandom() });
  store.setExpiryHandler((scopeId) => manager.destroyOwnedScope(scopeId));
  const issued = store.create();
  const first = manager.createOwned(issued.scopeId);
  const second = manager.createOwned(issued.scopeId);
  assert.equal("ownerScopeId" in first, false);
  clock.advance(30 * 60_000 + 1);
  assert.equal(store.authorize(issued.token, issued.verifier), null);
  assert.throws(() => manager.get(first.id), /not found/);
  assert.throws(() => manager.get(second.id), /not found/);
  manager.close();
});

test("game capacity is three per anonymous owner and foreign scope receives the hidden not-found response", () => {
  const manager = new GameSessionManager(() => 0, (() => { let id = 0; return () => `bounded-${++id}`; })());
  const first = manager.createOwned("scope-a");
  manager.createOwned("scope-a");
  manager.createOwned("scope-a");
  assert.throws(() => manager.createOwned("scope-a"), (error: unknown) => error instanceof Error && "code" in error && error.code === "game_limit_reached");
  assert.throws(() => manager.getOwned(first.id, "scope-b"), (error: unknown) => error instanceof Error && "code" in error && error.code === "game_not_found");
  manager.close();
});
