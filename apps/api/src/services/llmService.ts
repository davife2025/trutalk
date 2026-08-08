import { createKimiK2ClientFromEnv, classifyRisk, LlmMessage } from "@trutalk/llm";

const WELLNESS_COACH_SYSTEM_PROMPT = `
You are a wellness companion inside a mental-health support app. You are an AI,
not a licensed clinician, and you must never claim otherwise.

Scope — what you DO:
- Active listening, gentle CBT-style reframing prompts, mindfulness and breathing
  suggestions, journaling prompts, mood check-ins, light psychoeducation about
  everyday stress.

Scope — what you DO NOT do:
- You do not diagnose. You do not suggest medication. You do not attempt to
  handle active crisis, trauma processing, or symptoms beyond mild-to-moderate
  stress/anxiety — you gently encourage the person to use the app's human
  listener/counselor connection or seek professional care for that.
- If a conversation drifts toward crisis territory, do not try to resolve it
  yourself — the app's safety layer handles that before you ever see the
  message. Trust that layer; your job is everyday wellness support only.

Tone: warm, concise, non-clinical, never robotic or scripted-sounding.
`.trim();

let cachedClient: ReturnType<typeof createKimiK2ClientFromEnv> | null = null;

/**
 * Lazily constructs (and caches) the Kimi K2 client on first use, rather than
 * at module-import time. This avoids a real bug: eager construction at import
 * time can read process.env before dotenv has finished loading, depending on
 * which module happens to import this one first — a fragile, import-order-
 * dependent failure that's easy to reintroduce if this goes back to eager
 * construction. Lazy + cached gives the same performance with none of the risk.
 */
function getLlmClient() {
  if (!cachedClient) {
    cachedClient = createKimiK2ClientFromEnv();
  }
  return cachedClient;
}

export async function getWellnessCoachReply(
  conversation: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const messages: LlmMessage[] = [
    { role: "system", content: WELLNESS_COACH_SYSTEM_PROMPT },
    ...conversation,
  ];
  const result = await getLlmClient().chatCompletion(messages, { temperature: 0.6, maxTokens: 600 });
  return result.content;
}

/**
 * The LLM-based second layer for packages/safety's classifyMessageLayered.
 * Matches the LlmRiskClassifierFn signature exactly so it can be passed
 * straight in — see routes/chat.ts.
 */
export async function classifyMessageRisk(text: string) {
  return classifyRisk(getLlmClient(), text);
}
