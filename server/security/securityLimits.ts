/** Fixed local limits for the W08 anonymous-session security boundary. */
export const W08_SECURITY_LIMITS = Object.freeze({
  requestBodyBytes: 16_384,
  rateWindowMs: 60_000,
  session: Object.freeze({
    idleTtlMs: 30 * 60_000,
    absoluteTtlMs: 8 * 60 * 60_000,
    maxActive: 100,
    maxCreationsPerWindow: 20,
  }),
  game: Object.freeze({
    idleTtlMs: 30 * 60_000,
    maxPerScope: 3,
    maxProcess: 100,
  }),
  subscription: Object.freeze({
    maxPerGame: 1,
    maxPerScope: 3,
    maxProcess: 100,
  }),
  agent: Object.freeze({
    maxActivePerScope: 1,
    maxActiveProcess: 2,
    maxAcceptedPerScopePerWindow: 5,
    maxAcceptedProcessPerWindow: 20,
    maxDecisions: 5,
    maxToolCalls: 4,
    maxEvaluatorCalls: 2,
    maxProviderAttempts: 8,
    maxProviderFallbacks: 2,
    providerResponseBytes: 16_384,
    modelTextChars: 4_096,
    toolResultBytes: 4_096,
    providerCallTimeoutMs: 10_000,
    totalDeadlineMs: 45_000,
  }),
});
