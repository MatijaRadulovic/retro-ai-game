import { W08_SECURITY_LIMITS } from "./securityLimits.ts";

type ScopeBudget = { activeRuns: number; acceptedRunTimes: number[] };

export class ResourceAdmissionError extends Error {
  readonly code: "agent_busy" | "agent_rate_limited" | "agent_capacity_exhausted";
  constructor(code: "agent_busy" | "agent_rate_limited" | "agent_capacity_exhausted") { super(code); this.code = code; }
}

export class RunLease {
  private sealed = false;
  private released = false;
  private pendingProviderCalls = 0;
  private readonly onRelease: () => void;

  constructor(onRelease: () => void) { this.onRelease = onRelease; }

  trackProviderCall<T>(promise: Promise<T>): Promise<T> {
    if (this.released) return promise;
    this.pendingProviderCalls += 1;
    return promise.finally(() => {
      this.pendingProviderCalls -= 1;
      this.maybeRelease();
    });
  }

  release(): void { this.sealed = true; this.maybeRelease(); }

  private maybeRelease(): void {
    if (this.sealed && this.pendingProviderCalls === 0 && !this.released) {
      this.released = true;
      this.onRelease();
    }
  }
}

export class ResourceGovernor {
  private readonly scopes = new Map<string, ScopeBudget>();
  private readonly processRunTimes: number[] = [];
  private activeProcessRuns = 0;
  private readonly now: () => number;

  constructor(now: () => number = () => performance.now()) { this.now = now; }

  get activeRuns(): number { return this.activeProcessRuns; }
  activeRunsFor(scopeId: string): number { return this.scopes.get(scopeId)?.activeRuns ?? 0; }

  tryAcquireRun(scopeId: string): RunLease {
    const now = this.now();
    this.prune(now);
    const budget = this.scopes.get(scopeId) ?? { activeRuns: 0, acceptedRunTimes: [] };
    if (budget.activeRuns >= W08_SECURITY_LIMITS.agent.maxActivePerScope) throw new ResourceAdmissionError("agent_busy");
    if (budget.acceptedRunTimes.length >= W08_SECURITY_LIMITS.agent.maxAcceptedPerScopePerWindow
      || this.processRunTimes.length >= W08_SECURITY_LIMITS.agent.maxAcceptedProcessPerWindow) {
      throw new ResourceAdmissionError("agent_rate_limited");
    }
    if (this.activeProcessRuns >= W08_SECURITY_LIMITS.agent.maxActiveProcess) throw new ResourceAdmissionError("agent_capacity_exhausted");
    budget.activeRuns += 1;
    budget.acceptedRunTimes.push(now);
    this.scopes.set(scopeId, budget);
    this.activeProcessRuns += 1;
    this.processRunTimes.push(now);
    return new RunLease(() => {
      budget.activeRuns = Math.max(0, budget.activeRuns - 1);
      this.activeProcessRuns = Math.max(0, this.activeProcessRuns - 1);
      this.deleteEmptyScope(scopeId, budget);
    });
  }

  clearScope(scopeId: string): void {
    const budget = this.scopes.get(scopeId);
    if (budget && budget.activeRuns === 0) this.scopes.delete(scopeId);
  }

  private prune(now: number): void {
    const cutoff = now - W08_SECURITY_LIMITS.rateWindowMs;
    while (this.processRunTimes.length && this.processRunTimes[0]! <= cutoff) this.processRunTimes.shift();
    for (const [scopeId, budget] of this.scopes) {
      while (budget.acceptedRunTimes.length && budget.acceptedRunTimes[0]! <= cutoff) budget.acceptedRunTimes.shift();
      this.deleteEmptyScope(scopeId, budget);
    }
  }

  private deleteEmptyScope(scopeId: string, budget: ScopeBudget): void {
    if (budget.activeRuns === 0 && budget.acceptedRunTimes.length === 0) this.scopes.delete(scopeId);
  }
}
