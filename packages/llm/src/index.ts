/**
 * Kimi K2 client via Hugging Face Inference.
 *
 * Uses Hugging Face's OpenAI-compatible chat-completions router, which is the
 * current recommended way to call Kimi K2 (moonshotai/Kimi-K2-Instruct) through
 * HF Inference Providers. If you're using a dedicated Inference Endpoint instead
 * of the shared router, set HF_INFERENCE_ENDPOINT_URL and it will be used instead.
 *
 * IMPORTANT: this client is called ONLY from apps/api (server-side). Never expose
 * HUGGINGFACE_API_TOKEN to apps/web.
 */

export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmClientConfig {
  apiToken: string;
  modelId: string; // e.g. "moonshotai/Kimi-K2-Instruct"
  /** Optional: use a dedicated HF Inference Endpoint URL instead of the shared router */
  endpointUrl?: string;
  /** Default router used by HF Inference Providers for chat completions */
  routerUrl?: string;
}

export interface LlmCompletionResult {
  content: string;
  raw: unknown;
}

const DEFAULT_ROUTER_URL = "https://router.huggingface.co/v1/chat/completions";

export class KimiK2Client {
  private apiToken: string;
  private modelId: string;
  private url: string;

  constructor(config: LlmClientConfig) {
    if (!config.apiToken) {
      throw new Error("HUGGINGFACE_API_TOKEN is required to construct KimiK2Client.");
    }
    this.apiToken = config.apiToken;
    this.modelId = config.modelId;
    this.url = config.endpointUrl ?? config.routerUrl ?? DEFAULT_ROUTER_URL;
  }

  async chatCompletion(
    messages: LlmMessage[],
    opts: { temperature?: number; maxTokens?: number } = {}
  ): Promise<LlmCompletionResult> {
    const res = await fetch(this.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 800,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Kimi K2 inference request failed (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    const content = data.choices?.[0]?.message?.content ?? "";
    return { content, raw: data };
  }
}

export type LlmRiskLevel = "none" | "watch" | "high";

export interface LlmRiskClassification {
  riskLevel: LlmRiskLevel;
  reasoning: string;
}

const RISK_CLASSIFIER_SYSTEM_PROMPT = `
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

Respond with ONLY a JSON object, no other text, no markdown formatting:
{"riskLevel": "none" | "watch" | "high", "reasoning": "one short sentence"}
`.trim();

/**
 * LLM-based risk classification, meant to run as a SECOND layer behind the
 * fast keyword classifier in packages/safety (see classifyMessageLayered) —
 * not as a replacement for it. Catches indirect/Pidgin phrasing the keyword
 * list structurally cannot.
 *
 * Returns null on ANY failure (network error, non-200, unparseable response,
 * invalid riskLevel value) — the caller is responsible for failing safe
 * (see packages/safety's design rules: default to the higher risk level when
 * uncertain). This function deliberately never throws so a flaky network
 * call can't crash the request path; it also never silently defaults to
 * "none" on failure, which would be the unsafe direction.
 */
export async function classifyRisk(
  client: KimiK2Client,
  text: string
): Promise<LlmRiskClassification | null> {
  try {
    const result = await client.chatCompletion(
      [
        { role: "system", content: RISK_CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      { temperature: 0, maxTokens: 100 }
    );

    const cleaned = result.content.trim().replace(/^```json\s*|```$/g, "");
    const parsed = JSON.parse(cleaned) as { riskLevel?: string; reasoning?: string };

    if (parsed.riskLevel === "none" || parsed.riskLevel === "watch" || parsed.riskLevel === "high") {
      return { riskLevel: parsed.riskLevel, reasoning: parsed.reasoning ?? "" };
    }
    return null; // unexpected value — caller fails safe
  } catch {
    return null; // network error, non-200, JSON parse failure, etc. — caller fails safe
  }
}

/** Convenience factory reading from process.env — call from apps/api only. */
export function createKimiK2ClientFromEnv(): KimiK2Client {
  return new KimiK2Client({
    apiToken: process.env.HUGGINGFACE_API_TOKEN ?? "",
    modelId: process.env.HF_KIMI_K2_MODEL_ID ?? "moonshotai/Kimi-K2-Instruct",
    endpointUrl: process.env.HF_INFERENCE_ENDPOINT_URL || undefined,
  });
}
