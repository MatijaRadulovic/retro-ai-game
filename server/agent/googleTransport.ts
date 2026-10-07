import { ADVICE_MODELS, type AdviceModel } from "../../src/ai/shopAdvice.ts";
import {
  GEMINI_ORIGIN, classifyStatus, extractCandidateText, extractUsage, readLimitedResponse, retryAfterMs,
} from "../ai/geminiTransport.ts";
import { ProviderFailure, type ProviderResponse } from "../ai/shopAdvice.ts";
import { AGENT_SYSTEM_PROMPT } from "./prompt.ts";
import type { AgentStepRequest, AgentTransport } from "./types.ts";

function stripFence(text: string): string {
  const match = /^```(?:json)?\s*([\s\S]*?)\s*```$/.exec(text.trim());
  return match ? match[1] : text;
}

function buildBody(request: AgentStepRequest): Record<string, unknown> {
  return {
    systemInstruction: { parts: [{ text: AGENT_SYSTEM_PROMPT }] },
    contents: [{ role: "user", parts: [{ text: JSON.stringify(request) }] }],
    // A full final envelope is ~300 tokens; the rest is headroom for model thinking, which counts against the cap.
    generationConfig: { maxOutputTokens: 2048, temperature: 0.2 },
  };
}

/** One attempt per call. The same JSON-envelope request works for all three allowlisted models. */
export function createGoogleAgentTransport(apiKey: string, fetchImpl: typeof fetch = fetch): AgentTransport {
  if (!apiKey.trim()) throw new Error("Gemini key is not configured.");
  return async (model: AdviceModel, request: AgentStepRequest, signal: AbortSignal): Promise<ProviderResponse> => {
    if (!ADVICE_MODELS.includes(model)) throw new ProviderFailure("terminal", 400, undefined, "bad_request");
    let response: Response;
    try {
      response = await fetchImpl(`${GEMINI_ORIGIN}/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        redirect: "error",
        signal,
        body: JSON.stringify(buildBody(request)),
      });
    } catch {
      throw new ProviderFailure("transient", undefined, undefined, "network");
    }
    if (!response.ok) {
      const classification = classifyStatus(response.status);
      const retryAfter = retryAfterMs(response.headers.get("retry-after"));
      await response.body?.cancel();
      throw new ProviderFailure(classification.kind, response.status, retryAfter, classification.errorClass);
    }
    const payload = await readLimitedResponse(response);
    const text = extractCandidateText(payload);
    try {
      return { value: JSON.parse(stripFence(text)) as unknown, usage: extractUsage(payload) };
    } catch {
      throw new ProviderFailure("invalid_output", undefined, undefined, "invalid_json");
    }
  };
}
