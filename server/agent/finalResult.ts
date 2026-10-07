import {
  isPerk, isToolName, MAX_EVIDENCE, MAX_FINDING_CHARS, MAX_PLAN_LENGTH, MAX_SUMMARY_CHARS,
  type AgentEvidence, type AgentResult, type Perk,
} from "../../src/ai/shopAgent.ts";
import type { TranscriptEntry } from "./types.ts";

const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function boundedText(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length >= 1 && value.length <= max && !CONTROL_CHARACTERS.test(value);
}

function samePlan(first: readonly Perk[], second: readonly Perk[]): boolean {
  return first.length === second.length && first.every((perk, index) => perk === second[index]);
}

function emptyPlanJustified(transcript: readonly TranscriptEntry[]): boolean {
  const entry = [...transcript].reverse().find((item) => item.tool === "get_shop_state");
  if (!entry || !isRecord(entry.result)) return false;
  const state = entry.result;
  const points = state.perkPoints;
  if (typeof points !== "number") return false;
  const costs = [state.extraXp, state.luck, state.extraLife].map((perk) => (isRecord(perk) ? perk.nextCost : undefined));
  if (costs.some((cost) => cost !== null && typeof cost !== "number")) return false;
  return costs.every((cost) => cost === null || (cost as number) > points);
}

export function validateAgentResult(
  value: unknown,
  transcript: readonly TranscriptEntry[],
  validPlans: readonly Perk[][],
): AgentResult | null {
  if (!isRecord(value) || !exactKeys(value, ["summary", "plan", "evidence", "confidence", "completed"])) return null;
  const { summary, plan, evidence, confidence, completed } = value;
  if (!boundedText(summary, MAX_SUMMARY_CHARS) || completed !== true) return null;
  if (confidence !== "low" && confidence !== "medium" && confidence !== "high") return null;
  if (!Array.isArray(plan) || plan.length > MAX_PLAN_LENGTH || !plan.every(isPerk)) return null;
  if (!Array.isArray(evidence) || evidence.length < 1 || evidence.length > MAX_EVIDENCE) return null;

  const checked: AgentEvidence[] = [];
  for (const item of evidence) {
    if (!isRecord(item) || !exactKeys(item, ["source", "step", "finding"])) return null;
    const { source, step, finding } = item;
    if (!isToolName(source) || typeof step !== "number" || !Number.isSafeInteger(step) || !boundedText(finding, MAX_FINDING_CHARS)) return null;
    const entry = transcript.find((candidate) => candidate.step === step && candidate.tool === source);
    if (!entry) return null;
    if (source === "get_recent_runs" && isRecord(entry.result) && Array.isArray(entry.result.runs) && entry.result.runs.length === 0) return null;
    checked.push({ source, step, finding });
  }

  const checkedPlan = plan as Perk[];
  if (checkedPlan.length > 0) {
    if (!validPlans.some((candidate) => samePlan(candidate, checkedPlan))) return null;
  } else if (!emptyPlanJustified(transcript)) {
    return null;
  }
  return { summary, plan: checkedPlan, evidence: checked, confidence, completed: true };
}

const PERK_LABELS: Record<Perk, string> = { extra_xp: "EXTRA XP", luck: "LUCK", extra_life: "+1 LIFE" };

/** Player-facing plan line built by the server from validated facts, never from model prose. */
export function buildPlanLine(plan: readonly Perk[], transcript: readonly TranscriptEntry[]): string {
  if (plan.length === 0) return "PLAN: BUY NOTHING YET. SAVE YOUR POINTS.";
  const names = plan.map((perk) => PERK_LABELS[perk]).join(" → ");
  const evaluated = [...transcript].reverse().find((entry) => entry.tool === "evaluate_perk_plan"
    && isRecord(entry.arguments) && Array.isArray(entry.arguments.plan)
    && samePlan(entry.arguments.plan as Perk[], plan) && isRecord(entry.result));
  if (!evaluated || !isRecord(evaluated.result)) return `PLAN: ${names}.`;
  return `PLAN: ${names} · COST ${evaluated.result.totalCost} PT · ${evaluated.result.pointsLeft} PT LEFT.`;
}
