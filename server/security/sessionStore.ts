import { createHash, randomBytes as nodeRandomBytes, timingSafeEqual } from "node:crypto";
import { randomUUID } from "node:crypto";
import { W08_SECURITY_LIMITS } from "./securityLimits.ts";

type SessionRecord = {
  tokenHash: string;
  scopeId: string;
  verifierHash: string;
  createdAt: number;
  lastSeenAt: number;
};

export type IssuedSession = { token: string; verifier: string; scopeId: string; expiresInSeconds: number };
export type AuthorizedScope = Readonly<{ scopeId: string }>;
export type SessionAuthorization = { scope: AuthorizedScope; failure?: never } | { scope: null; failure: "session_required" | "session_expired" | "request_forbidden" };
export type SessionStoreOptions = { now?: () => number; randomBytes?: (size: number) => Buffer };

export class SessionStoreError extends Error {
  readonly code: "session_rate_limited" | "session_capacity_exhausted";
  constructor(code: "session_rate_limited" | "session_capacity_exhausted") { super(code); this.code = code; }
}

function digest(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex");
  const b = Buffer.from(right, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export class SessionStore {
  private readonly records = new Map<string, SessionRecord>();
  private readonly issuanceTimes: number[] = [];
  private readonly now: () => number;
  private readonly randomBytes: (size: number) => Buffer;
  private onExpire: (scopeId: string) => void = () => {};

  constructor(options: SessionStoreOptions = {}) {
    this.now = options.now ?? (() => performance.now());
    this.randomBytes = options.randomBytes ?? nodeRandomBytes;
  }

  get activeCount(): number { this.prune(); return this.records.size; }

  setExpiryHandler(handler: (scopeId: string) => void): void { this.onExpire = handler; }

  create(existingToken?: string): IssuedSession {
    this.prune();
    const now = this.now();
    let record = existingToken ? this.lookup(existingToken) : undefined;
    if (!record) {
      this.pruneIssuance(now);
      if (this.records.size >= W08_SECURITY_LIMITS.session.maxActive) throw new SessionStoreError("session_capacity_exhausted");
      if (this.issuanceTimes.length >= W08_SECURITY_LIMITS.session.maxCreationsPerWindow) throw new SessionStoreError("session_rate_limited");
      const token = this.randomBytes(32).toString("base64url");
      const verifier = this.randomBytes(32).toString("base64url");
      record = { tokenHash: digest(token), scopeId: randomUUID(), verifierHash: digest(verifier), createdAt: now, lastSeenAt: now };
      this.records.set(record.tokenHash, record);
      this.issuanceTimes.push(now);
      return { token, verifier, scopeId: record.scopeId, expiresInSeconds: W08_SECURITY_LIMITS.session.absoluteTtlMs / 1000 };
    }
    const verifier = this.randomBytes(32).toString("base64url");
    record.verifierHash = digest(verifier);
    record.lastSeenAt = now;
    return { token: existingToken!, verifier, scopeId: record.scopeId, expiresInSeconds: Math.floor((record.createdAt + W08_SECURITY_LIMITS.session.absoluteTtlMs - now) / 1000) };
  }

  authorize(token: string | undefined, verifier: string | undefined): AuthorizedScope | null {
    return this.authorizeDetailed(token, verifier).scope;
  }

  authorizeDetailed(token: string | undefined, verifier: string | undefined): SessionAuthorization {
    if (!token) return { scope: null, failure: "session_required" };
    this.prune();
    const record = this.lookup(token);
    if (!record) return { scope: null, failure: "session_required" };
    const now = this.now();
    if (now - record.lastSeenAt >= W08_SECURITY_LIMITS.session.idleTtlMs || now - record.createdAt >= W08_SECURITY_LIMITS.session.absoluteTtlMs) {
      this.records.delete(record.tokenHash);
      this.onExpire(record.scopeId);
      return { scope: null, failure: "session_expired" };
    }
    if (!verifier || !safeEqual(record.verifierHash, digest(verifier))) return { scope: null, failure: "request_forbidden" };
    record.lastSeenAt = now;
    return { scope: Object.freeze({ scopeId: record.scopeId }) };
  }

  hasRawToken(token: string): boolean { return this.records.has(token); }

  revoke(token: string | undefined): void {
    if (token) this.records.delete(digest(token));
  }

  private lookup(token: string): SessionRecord | undefined { return this.records.get(digest(token)); }

  private pruneIssuance(now: number): void {
    while (this.issuanceTimes.length && this.issuanceTimes[0]! <= now - W08_SECURITY_LIMITS.rateWindowMs) this.issuanceTimes.shift();
  }

  private prune(): void {
    const now = this.now();
    for (const [key, record] of this.records) {
      if (now - record.lastSeenAt >= W08_SECURITY_LIMITS.session.idleTtlMs || now - record.createdAt >= W08_SECURITY_LIMITS.session.absoluteTtlMs) {
        this.records.delete(key);
        this.onExpire(record.scopeId);
      }
    }
    this.pruneIssuance(now);
  }
}
