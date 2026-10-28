import {
  isPerk, isToolName, MAX_EVIDENCE, MAX_FINDING_CHARS, MAX_PLAN_LENGTH, MAX_SUMMARY_CHARS,
  isSafeAgentText, type AgentEvidence, type AgentResult, type Perk,
} from "../../src/ai/shopAgent.ts";
import type { TranscriptEntry } from "./types.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function boundedText(value: unknown, max: number): value is string {
  return isSafeAgentText(value, max);
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

type EvidenceFact =
  | "perk_points" | "extra_xp_state" | "luck_state" | "extra_life_state"
  | "plan_valid" | "plan_total_cost" | "points_left"
  | "run_count" | "latest_run_score" | "latest_run_level" | "latest_run_end";

function resolveEvidence(source: unknown, step: unknown, fact: unknown, transcript: readonly TranscriptEntry[]): AgentEvidence | null {
  if (!isToolName(source) || typeof step !== "number" || !Number.isSafeInteger(step) || step < 1 || typeof fact !== "string") return null;
  const entry = transcript.find((candidate) => candidate.step === step && candidate.tool === source);
  if (!entry || !isRecord(entry.result)) return null;
  const result = entry.result;
  let finding: string | null = null;
  if (source === "get_shop_state") {
    if (fact === "perk_points" && typeof result.perkPoints === "number") finding = `Current perk points: ${result.perkPoints}.`;
    if (fact === "extra_xp_state" && isRecord(result.extraXp) && typeof result.extraXp.level === "number") finding = `Extra XP level: ${result.extraXp.level}; next cost: ${result.extraXp.nextCost ?? "capped"}.`;
    if (fact === "luck_state" && isRecord(result.luck) && typeof result.luck.level === "number") finding = `Luck level: ${result.luck.level}; next cost: ${result.luck.nextCost ?? "capped"}.`;
    if (fact === "extra_life_state" && isRecord(result.extraLife) && typeof result.extraLife.charges === "number") finding = `Extra Life charges: ${result.extraLife.charges}; next cost: ${result.extraLife.nextCost ?? "capped"}.`;
  }
  if (source === "evaluate_perk_plan") {
    if (fact === "plan_valid" && typeof result.valid === "boolean") finding = `Evaluated plan is ${result.valid ? "valid" : "invalid"}.`;
    if (fact === "plan_total_cost" && typeof result.totalCost === "number") finding = `Evaluated plan total cost: ${result.totalCost} points.`;
    if (fact === "points_left" && typeof result.pointsLeft === "number") finding = `Points remaining after evaluation: ${result.pointsLeft}.`;
  }
  if (source === "get_recent_runs" && Array.isArray(result.runs)) {
    const runs = result.runs;
    if (fact === "run_count") finding = `Recent finished runs available: ${runs.length}.`;
    const latest = runs[0];
    if (isRecord(latest)) {
      if (fact === "latest_run_score" && typeof latest.score === "number") finding = `Latest finished run score: ${latest.score}.`;
      if (fact === "latest_run_level" && typeof latest.level === "number") finding = `Latest finished run level: ${latest.level}.`;
      if (fact === "latest_run_end" && (latest.endedBy === "game_over" || latest.endedBy === "won" || latest.endedBy === "restart")) finding = `Latest finished run ended by: ${latest.endedBy}.`;
    }
  }
  if (!finding || finding.length > MAX_FINDING_CHARS) return null;
  return { source, step, finding };
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
    if (!isRecord(item) || !exactKeys(item, ["source", "step", "fact"])) return null;
    const resolved = resolveEvidence(item.source, item.step, item.fact as EvidenceFact, transcript);
    if (!resolved) return null;
    checked.push(resolved);
  }

  const checkedPlan = plan as Perk[];
  if (checkedPlan.length > 0) {
    if (!validPlans.some((candidate) => samePlan(candidate, checkedPlan))) return null;
  } else if (!emptyPlanJustified(transcript)) {
    return null;
  }
  return { summary: buildSummary(checkedPlan), plan: checkedPlan, evidence: checked, confidence, completed: true };
}

const PERK_LABELS: Record<Perk, string> = { extra_xp: "EXTRA XP", luck: "LUCK", extra_life: "+1 LIFE" };

/** Never display model-authored prose; derive the player-facing summary from the evaluated plan. */
function buildSummary(plan: readonly Perk[]): string {
  return plan.length === 0
    ? "No purchase is recommended now; save your perk points."
    : `Recommended order: ${plan.map((perk) => PERK_LABELS[perk]).join(" → ")}.`;
}

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
