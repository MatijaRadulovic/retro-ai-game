import { ADVICE_MODELS, type AdviceModel } from "../../src/ai/shopAdvice.ts";
import {
  ProviderFailure,
  type AdviceTransport,
  type ProviderFailureKind,
  type ProviderResponse,
  type ProviderUsage,
  type ShopAdviceContext,
} from "./shopAdvice.ts";
import { SHOP_ADVISOR_SYSTEM_PROMPT } from "./shopPrompt.ts";

const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com";
const MAX_RESPONSE_BYTES = 16_384;
const MAX_MODEL_TEXT_LENGTH = 4_096;
const MAX_RETRY_AFTER_MS = 5 * 60_000;
const GEMMA_MODEL = ADVICE_MODELS[2];

const modelOutputSchema = {
  type: "object",
  properties: {
    decision: { type: "string", enum: ["buy_extra_xp", "buy_luck", "buy_extra_life", "wait"] },
    reasonCode: { type: "string", enum: ["faster_xp", "more_lucky", "collision_protection", "save_points", "cannot_afford", "all_capped"] },
  },
  required: ["decision", "reasonCode"],
  additionalProperties: false,
} as const;

const GEMMA_JSON_INSTRUCTION = [
  SHOP_ADVISOR_SYSTEM_PROMPT,
  "Return only one JSON object with exactly decision and reasonCode. Do not use Markdown or add explanatory text.",
].join("\n\n");

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonNegativeInt(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(MAX_RETRY_AFTER_MS, Math.ceil(seconds * 1000));
  }
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.min(MAX_RETRY_AFTER_MS, Math.max(0, date - Date.now())) : undefined;
}

async function readLimitedResponse(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new ProviderFailure("invalid_output", undefined, undefined, "empty_output");
  const parts: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new ProviderFailure("invalid_output", undefined, undefined, "response_too_large");
      }
      parts.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  if (length === 0) throw new ProviderFailure("invalid_output", undefined, undefined, "empty_output");
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new ProviderFailure("invalid_output", undefined, undefined, "invalid_json");
  }
}

function extractUsage(payload: unknown): ProviderUsage | undefined {
  if (!isRecord(payload) || !isRecord(payload.usageMetadata)) return undefined;
  const metadata = payload.usageMetadata;
  const usage: ProviderUsage = {
    inputTokens: nonNegativeInt(metadata.promptTokenCount),
    outputTokens: nonNegativeInt(metadata.candidatesTokenCount),
    totalTokens: nonNegativeInt(metadata.totalTokenCount),
    cachedTokens: nonNegativeInt(metadata.cachedContentTokenCount),
    thoughtTokens: nonNegativeInt(metadata.thoughtsTokenCount),
  };
  return Object.values(usage).some((value) => value !== undefined) ? usage : undefined;
}

function extractCandidateText(payload: unknown): string {
  if (!isRecord(payload)) throw new ProviderFailure("invalid_output", undefined, undefined, "schema_invalid");
  if (isRecord(payload.promptFeedback) && payload.promptFeedback.blockReason) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "refusal");
  }
  if (!Array.isArray(payload.candidates) || payload.candidates.length === 0) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "empty_output");
  }
  if (payload.candidates.length !== 1) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "schema_invalid");
  }
  const candidate: unknown = payload.candidates[0];
  if (!isRecord(candidate)) throw new ProviderFailure("invalid_output", undefined, undefined, "schema_invalid");
  if (candidate.finishReason !== "STOP") {
    const errorClass = candidate.finishReason === "SAFETY" || candidate.finishReason === "PROHIBITED_CONTENT"
      ? "refusal" : "schema_invalid";
    throw new ProviderFailure("invalid_output", undefined, undefined, errorClass);
  }
  if (!isRecord(candidate.content) || !Array.isArray(candidate.content.parts)
    || candidate.content.parts.length === 0) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "empty_output");
  }
  if (candidate.content.parts.length !== 1) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "schema_invalid");
  }
  const part: unknown = candidate.content.parts[0];
  if (!isRecord(part) || typeof part.text !== "string") {
    throw new ProviderFailure("invalid_output", undefined, undefined, "schema_invalid");
  }
  if (part.text.trim().length === 0) throw new ProviderFailure("invalid_output", undefined, undefined, "empty_output");
  if (part.text.length > MAX_MODEL_TEXT_LENGTH) {
    throw new ProviderFailure("invalid_output", undefined, undefined, "response_too_large");
  }
  return part.text;
}

function extractDecision(payload: unknown): ProviderResponse {
  const text = extractCandidateText(payload);
  try {
    return { value: JSON.parse(text) as unknown, usage: extractUsage(payload) };
  } catch {
    throw new ProviderFailure("invalid_output", undefined, undefined, "invalid_json");
  }
}

function modelContent(context: ShopAdviceContext): string {
  return JSON.stringify({
    score: context.score,
    xp: context.xp,
    level: context.level,
    perkPoints: context.perkPoints,
    extraXp: context.extraXp,
    luck: context.luck,
    extraLife: context.extraLife,
  });
}

function geminiRequest(context: ShopAdviceContext): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: SHOP_ADVISOR_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: modelContent(context) }] }],
    generationConfig: {
      maxOutputTokens: 128,
      responseFormat: { text: { mimeType: "APPLICATION_JSON", schema: modelOutputSchema } },
    },
  };
}

function gemmaRequest(context: ShopAdviceContext): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: GEMMA_JSON_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: modelContent(context) }] }],
    generationConfig: { maxOutputTokens: 128, temperature: 1, topP: 0.95, topK: 64 },
  };
}

function classifyStatus(status: number): { kind: ProviderFailureKind; errorClass?: ConstructorParameters<typeof ProviderFailure>[3] } {
  if (status === 404) return { kind: "capability", errorClass: "model_unavailable" };
  if (status === 408) return { kind: "transient", errorClass: "timeout" };
  if (status === 429) return { kind: "transient", errorClass: "rate_limited" };
  if (status >= 500 && status <= 599) return { kind: "transient", errorClass: "provider_unavailable" };
  if (status === 400) return { kind: "terminal", errorClass: "bad_request" };
  if (status === 401) return { kind: "terminal", errorClass: "unauthorized" };
  if (status === 403) return { kind: "terminal", errorClass: "forbidden" };
  if (status === 409) return { kind: "terminal", errorClass: "conflict" };
  return { kind: "terminal", errorClass: "provider_error" };
}

export function createGeminiTransport(apiKey: string, fetchImpl: typeof fetch = fetch): AdviceTransport {
  if (!apiKey.trim()) throw new Error("Gemini key is not configured.");
  return async (model: AdviceModel, context: ShopAdviceContext, signal: AbortSignal): Promise<ProviderResponse> => {
    if (!ADVICE_MODELS.includes(model)) throw new ProviderFailure("terminal", 400, undefined, "bad_request");
    const url = `${GEMINI_ORIGIN}/v1beta/models/${model}:generateContent`;
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        redirect: "error",
        signal,
        body: JSON.stringify(model === GEMMA_MODEL ? gemmaRequest(context) : geminiRequest(context)),
      });
    } catch {
      throw new ProviderFailure("transient", undefined, undefined, "network");
    }
    if (!response.ok) {
      const status = response.status;
      const classification = classifyStatus(status);
      const retryAfter = retryAfterMs(response.headers.get("retry-after"));
      await response.body?.cancel();
      throw new ProviderFailure(classification.kind, status, retryAfter, classification.errorClass);
    }
    return extractDecision(await readLimitedResponse(response));
  };
}
