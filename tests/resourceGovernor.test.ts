import test from "node:test";
import assert from "node:assert/strict";
import { createFakeClock, deferred } from "./helpers/securityFixtures.ts";
import { ResourceAdmissionError, ResourceGovernor } from "../server/security/resourceGovernor.ts";

test("run governor enforces scope and process concurrency and releases exactly once after provider settlement", async () => {
  const governor = new ResourceGovernor(() => 1_000);
  const first = governor.tryAcquireRun("scope-a");
  assert.throws(() => governor.tryAcquireRun("scope-a"), (error) => error instanceof ResourceAdmissionError && error.code === "agent_busy");
  const second = governor.tryAcquireRun("scope-b");
  assert.throws(() => governor.tryAcquireRun("scope-c"), (error) => error instanceof ResourceAdmissionError && error.code === "agent_capacity_exhausted");
  const provider = deferred<string>();
  const tracked = first.trackProviderCall(provider.promise);
  first.release();
  first.release();
  assert.equal(governor.activeRuns, 2);
  provider.resolve("done");
  await tracked;
  assert.equal(governor.activeRuns, 1);
  second.release();
  assert.equal(governor.activeRuns, 0);
});

test("rolling run rate admits five per scope and twenty per process; rejected requests consume nothing", () => {
  const clock = createFakeClock(50_000);
  const governor = new ResourceGovernor(clock.now);
  for (let index = 0; index < 5; index += 1) governor.tryAcquireRun("scope-a").release();
  assert.throws(() => governor.tryAcquireRun("scope-a"), (error) => error instanceof ResourceAdmissionError && error.code === "agent_rate_limited");
  for (let scope = 0; scope < 3; scope += 1) {
    for (let index = 0; index < 5; index += 1) governor.tryAcquireRun(`scope-${scope}-extra`).release();
  }
  assert.throws(() => governor.tryAcquireRun("scope-new"), (error) => error instanceof ResourceAdmissionError && error.code === "agent_rate_limited");
  clock.advance(60_001);
  governor.tryAcquireRun("scope-a").release();
  assert.equal(governor.activeRuns, 0);
});
