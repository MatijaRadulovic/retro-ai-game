import type { ProviderResponse } from "../../server/ai/shopAdvice.ts";
import type { AgentStepRequest, AgentTransport } from "../../server/agent/types.ts";
import type { AdviceModel } from "../../src/ai/shopAdvice.ts";

export type FakeClock = {
  now: () => number;
  advance: (milliseconds: number) => number;
  set: (timestamp: number) => number;
};

export function createFakeClock(initialTimestamp = 0): FakeClock {
  if (!Number.isFinite(initialTimestamp)) throw new TypeError("timestamp must be finite");
  let timestamp = initialTimestamp;
  return {
    now: () => timestamp,
    advance(milliseconds) {
      if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError("advance must be non-negative");
      timestamp += milliseconds;
      return timestamp;
    },
    set(nextTimestamp) {
      if (!Number.isFinite(nextTimestamp)) throw new TypeError("timestamp must be finite");
      if (nextTimestamp < timestamp) throw new RangeError("clock cannot move backwards");
      timestamp = nextTimestamp;
      return timestamp;
    },
  };
}

export function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

export type TrackedProviderCall = { model: AdviceModel; request: AgentStepRequest };

export function createTrackedProvider(delegate: AgentTransport) {
  const calls: TrackedProviderCall[] = [];
  let activeCalls = 0;
  let maxConcurrentCalls = 0;
  const transport: AgentTransport = async (model, request, signal) => {
    calls.push({ model, request: structuredClone(request) });
    activeCalls += 1;
    maxConcurrentCalls = Math.max(maxConcurrentCalls, activeCalls);
    try {
      return await delegate(model, request, signal);
    } finally {
      activeCalls -= 1;
    }
  };
  return {
    transport,
    calls,
    get activeCalls() { return activeCalls; },
    get maxConcurrentCalls() { return maxConcurrentCalls; },
  };
}

export function fakeProviderResponse(value: unknown): ProviderResponse {
  return { value };
}
