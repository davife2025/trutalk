/**
 * Gemini API client, used specifically for the safety-classifier second
 * layer (see packages/safety's classifyMessageLayered) — the "key decision"
 * in this app is whether a message gets escalated to crisis resources, and
 * this is the model that makes that call. The wellness-coach conversational
 * replies remain on Kimi K2 (see packages/llm) — two specialized models,
 * two different jobs, not a wholesale swap.
 *
 * Uses Gemini's structured-output mode (responseSchema) rather than asking
 * the model to return JSON in free text and hoping it parses — this is
 * meaningfully more reliable for a safety-critical classification call than
 * the string-based approach used for Kimi K2's classifier in packages/llm.
 */

export type GeminiRiskLevel = "none" | "watch" | "high";

export interface GeminiRiskClassification {
  riskLevel: GeminiRiskLevel;
  reasoning: string;
}

export interface GeminiClientConfig {
  apiKey: string;
  modelId: string; // e.g. "gemini-2.0-flash"
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const RISK_CLASSIFIER_SYSTEM_INSTRUCTION = `
You are a safety classifier for a mental wellness app used in Nigeria. Classify
the user's message into exactly one risk level, considering English, Nigerian
Pidgin, and indirect/euphemistic phrasing:

- "high": any indication of suicidal ideation, self-harm, wanting to die, or
  giving up on life — whether stated directly or indirectly, in any dialect.
  Examples of indirect high-risk phrasing: "I don't want to be here anymore",
  "everyone would be better off without me", "I no wan live again".
- "watch": hopelessness or significant distress without explicit ideation of
  death or self-harm (e.g. "I can't go on like this", "nothing matters
  anymore").
- "none": everyday stress, venting, or idiomatic language that uses
  crisis-adjacent words non-literally (e.g. "this deadline is killing me").

When genuinely uncertain between two levels, choose the HIGHER risk level —
a false alarm costs far less here than a missed crisis signal.
`.trim();

export class GeminiClient {
  private apiKey: string;
  private modelId: string;

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey) {
      throw new Error("GEMINI_API_KEY is required to construct GeminiClient.");
    }
    this.apiKey = config.apiKey;
    this.modelId = config.modelId;
  }

  /**
   * Classifies a message's crisis-risk level. Returns null on ANY failure
   * (network error, non-200, unexpected response shape) — never throws, and
   * never silently defaults to "none". The caller (packages/safety's
   * classifyMessageLayered) is responsible for failing back to the keyword
   * baseline on null, per the same design rule used for the Kimi K2 layer.
   */
  async classifyRisk(text: string): Promise<GeminiRiskClassification | null> {
    try {
      const res = await fetch(
        `${GEMINI_BASE_URL}/${this.modelId}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: RISK_CLASSIFIER_SYSTEM_INSTRUCTION }] },
            contents: [{ role: "user", parts: [{ text }] }],
            generationConfig: {
              temperature: 0,
              responseMimeType: "application/json",
              responseSchema: {
                type: "OBJECT",
                properties: {
                  riskLevel: { type: "STRING", enum: ["none", "watch", "high"] },
                  reasoning: { type: "STRING" },
                },
                required: ["riskLevel", "reasoning"],
              },
            },
          }),
        }
      );

      if (!res.ok) return null;

      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };

      const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return null;

      const parsed = JSON.parse(jsonText) as { riskLevel?: string; reasoning?: string };
      if (parsed.riskLevel === "none" || parsed.riskLevel === "watch" || parsed.riskLevel === "high") {
        return { riskLevel: parsed.riskLevel, reasoning: parsed.reasoning ?? "" };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export function createGeminiClientFromEnv(): GeminiClient {
  return new GeminiClient({
    apiKey: process.env.GEMINI_API_KEY ?? "",
    modelId: process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash",
  });
}
