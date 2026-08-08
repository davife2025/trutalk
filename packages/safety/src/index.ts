/**
 * ============================================================================
 *  SAFETY / CRISIS-DETECTION LAYER — READ THIS BEFORE TOUCHING THIS FILE
 * ============================================================================
 * This module is the single most important piece of infrastructure in the
 * platform. It MUST run on every inbound chat message BEFORE the message
 * reaches the LLM (see apps/api/src/routes/chat.ts).
 *
 * WHAT THIS FILE CURRENTLY IS: a naive keyword-matching placeholder. It exists
 * so the request pipeline, database schema, and escalation UX can be built and
 * tested end-to-end from session 1.
 *
 * WHAT THIS FILE IS NOT: a production-ready crisis classifier. Before any real
 * user talks to this system, this needs to be replaced or augmented with a
 * properly evaluated classifier (fine-tuned model or a dedicated moderation
 * call), tested against real crisis-language benchmarks AND Nigerian
 * English/Pidgin/code-switched phrasing, with a measured false-negative rate.
 *
 * DESIGN RULES BAKED INTO THIS MODULE — do not remove these when you upgrade it:
 *   1. When uncertain, default to showing crisis resources. False positives
 *      (showing a hotline to someone who didn't strictly need it) are a much
 *      smaller cost than false negatives here.
 *   2. Never let the conversational LLM "handle" a high-risk message on its
 *      own. High risk => pre-written response + resources, full stop.
 *   3. Do not log full raw message content by default for flagged messages —
 *      log that an escalation occurred, not necessarily the verbatim text.
 * ============================================================================
 */

import type { RiskLevel } from "@trutalk/types";

export interface CrisisResource {
  name: string;
  phone: string | null;
  whatsapp: string | null;
  notes: string;
}

export interface ClassificationResult {
  riskLevel: RiskLevel;
  matchedSignal: boolean; // true if the naive classifier fired — replace with model confidence later
}

/**
 * Minimal, illustrative, NON-EXHAUSTIVE signal set for the placeholder
 * classifier. This is intentionally coarse. A real implementation should use
 * a proper model/service, not a keyword list — keyword lists are both easy to
 * evade and prone to false negatives on indirect language, which is exactly
 * the failure mode documented in the research (zero of 29 tested chatbots
 * handled crisis prompts adequately).
 */
const HIGH_RISK_SIGNALS = [
  "suicide",
  "kill myself",
  "end my life",
  "want to die",
  "self harm",
  "self-harm",
  "hurt myself",
];

const WATCH_SIGNALS = ["hopeless", "can't go on", "no reason to live", "give up on everything"];

export function classifyMessage(rawText: string): ClassificationResult {
  const text = rawText.toLowerCase();

  const highRiskHit = HIGH_RISK_SIGNALS.some((signal) => text.includes(signal));
  if (highRiskHit) {
    return { riskLevel: "high", matchedSignal: true };
  }

  const watchHit = WATCH_SIGNALS.some((signal) => text.includes(signal));
  if (watchHit) {
    return { riskLevel: "watch", matchedSignal: true };
  }

  return { riskLevel: "none", matchedSignal: false };
}

export type ClassificationSource = "keyword" | "llm" | "llm-unavailable-fallback";

export interface LayeredClassificationResult extends ClassificationResult {
  source: ClassificationSource;
}

/**
 * Function signature for an injectable LLM-based second-layer classifier.
 * packages/safety deliberately does NOT depend on packages/llm directly —
 * apps/api wires the two together (see apps/api/src/services/llmService.ts)
 * so this package stays testable and dependency-light on its own.
 */
export type LlmRiskClassifierFn = (
  text: string
) => Promise<{ riskLevel: RiskLevel; reasoning?: string } | null>;

/**
 * Two-layer classification: fast keyword pass first (catches direct language
 * with near-zero latency/cost), then — for anything the keyword pass didn't
 * already flag as high — an LLM-based second pass that can catch indirect
 * and Pidgin phrasing the keyword list structurally cannot (see Session 6's
 * eval results: 7 of 8 indirect/Pidgin high-risk test cases were missed by
 * the keyword-only classifier).
 *
 * FAILURE HANDLING — this is a deliberate, debatable design call, not an
 * obvious "right answer"; revisit it if your data suggests otherwise:
 *
 * When the LLM layer fails (network error, timeout, unparseable response),
 * this falls back to the KEYWORD LAYER'S OWN RESULT rather than blanket-
 * escalating to "high". Reasoning, discovered by actually testing this
 * against an unreachable LLM backend: the classifier and the reply-generator
 * share the same LLM provider, so a full outage means every single message
 * — including completely mundane ones — would fail the LLM layer. Blanket-
 * escalating all of those to "high" would mean showing crisis hotline
 * resources for messages like "feeling okay today", for as long as the
 * outage lasts. That's mass false alarming, which risks eroding user trust
 * in genuine crisis warnings (alarm fatigue) — arguably a worse outcome than
 * falling back to the keyword layer's already-established baseline
 * coverage. The keyword layer still catches direct high-risk language on
 * its own regardless of LLM availability; only indirect/Pidgin phrasing
 * loses its second layer of protection during an outage, and that gap
 * should be closed by monitoring `classification_source` in
 * crisis_escalation_events for "llm-unavailable-fallback" spikes and fixing
 * the outage — not by making every user's every message look like a crisis.
 */
export async function classifyMessageLayered(
  rawText: string,
  llmClassify?: LlmRiskClassifierFn
): Promise<LayeredClassificationResult> {
  const fast = classifyMessage(rawText);

  if (fast.riskLevel === "high") {
    return { ...fast, source: "keyword" };
  }

  if (!llmClassify) {
    return { ...fast, source: "keyword" };
  }

  const llmResult = await llmClassify(rawText);

  if (!llmResult) {
    // LLM layer unavailable — fall back to the keyword layer's own result.
    // See the design-rationale comment above this function.
    return { ...fast, source: "llm-unavailable-fallback" };
  }

  return { riskLevel: llmResult.riskLevel, matchedSignal: true, source: "llm" };
}

/**
 * Crisis resources directory. Phone numbers are intentionally left blank —
 * DO NOT invent or guess hotline numbers. Verify each one is current and
 * actually staffed before filling this in and before launch. Consider
 * partnering with an existing service (e.g. an established Nigerian
 * WhatsApp-based counseling initiative) rather than building this
 * relationship from scratch.
 */
export const CRISIS_RESOURCES: CrisisResource[] = [
  {
    name: process.env.CRISIS_LINE_PRIMARY_NAME ?? "Primary crisis line (configure in env)",
    phone: process.env.CRISIS_LINE_PRIMARY_PHONE || null,
    whatsapp: null,
    notes: "VERIFY this resource is current and staffed before launch.",
  },
  {
    name: process.env.CRISIS_LINE_SECONDARY_NAME ?? "Secondary crisis line (configure in env)",
    phone: process.env.CRISIS_LINE_SECONDARY_PHONE || null,
    whatsapp: null,
    notes: "VERIFY this resource is current and staffed before launch.",
  },
];

/** Pre-written (NOT LLM-generated) response shown when riskLevel === 'high'. */
export const CRISIS_RESPONSE_MESSAGE =
  "It sounds like you're going through something really hard right now. I'm an AI " +
  "wellness companion, not a crisis service, and I want to make sure you get real " +
  "support. Please reach out to one of the resources below, or contact local " +
  "emergency services if you're in immediate danger. You don't have to go through " +
  "this alone.";
