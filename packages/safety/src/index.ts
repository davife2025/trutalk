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

import type { RiskLevel } from "@platform/types";

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
