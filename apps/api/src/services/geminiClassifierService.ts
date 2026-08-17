import { createGeminiClientFromEnv } from "@trutalk/gemini";

let cachedClient: ReturnType<typeof createGeminiClientFromEnv> | null = null;

/**
 * Lazily constructs (and caches) the Gemini client on first use — same
 * reasoning as the Kimi K2 client in llmService.ts: eager construction at
 * import time can race against dotenv loading depending on module import
 * order, which previously caused a real server-boot crash (see Session 8).
 */
function getGeminiClient() {
  if (!cachedClient) {
    cachedClient = createGeminiClientFromEnv();
  }
  return cachedClient;
}

/**
 * The Gemini-backed LLM layer for packages/safety's classifyMessageLayered.
 * This is now the PRIMARY LLM classifier layer used in routes/chat.ts —
 * Gemini makes the crisis-escalation call; Kimi K2 (see llmService.ts)
 * handles the actual wellness-coaching conversation. Matches the
 * LlmRiskClassifierFn signature exactly so it can be passed straight in.
 */
export async function classifyMessageRiskGemini(text: string) {
  return getGeminiClient().classifyRisk(text);
}
