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

/** Convenience factory reading from process.env — call from apps/api only. */
export function createKimiK2ClientFromEnv(): KimiK2Client {
  return new KimiK2Client({
    apiToken: process.env.HUGGINGFACE_API_TOKEN ?? "",
    modelId: process.env.HF_KIMI_K2_MODEL_ID ?? "moonshotai/Kimi-K2-Instruct",
    endpointUrl: process.env.HF_INFERENCE_ENDPOINT_URL || undefined,
  });
}
