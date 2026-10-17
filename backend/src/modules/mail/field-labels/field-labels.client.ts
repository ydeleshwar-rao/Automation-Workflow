/**
 * Adapter for the LLM that turns raw form-field keys into readable labels.
 * The API key stays on the server — it used to be shipped to the browser.
 */

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const FIELD_LABEL_MODEL = "anthropic/claude-3-haiku";
const APP_TITLE = "Job Management";

export interface FieldLabelClient {
  /** Returns the model's raw text reply, or null when the client is not configured. */
  requestLabels(prompt: string): Promise<string | null>;
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

export function createOpenRouterFieldLabelClient(
  apiKey: string | undefined = process.env.OPENROUTER_API_KEY,
  sendRequest: typeof fetch = fetch,
): FieldLabelClient {
  return {
    async requestLabels(prompt) {
      if (!apiKey) return null;

      const response = await sendRequest(OPENROUTER_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-Title": APP_TITLE,
        },
        body: JSON.stringify({ model: FIELD_LABEL_MODEL, messages: [{ role: "user", content: prompt }] }),
      });
      if (!response.ok) throw new Error(`OpenRouter responded with ${response.status}`);

      const completion = (await response.json()) as ChatCompletionResponse;
      return completion.choices?.[0]?.message?.content ?? null;
    },
  };
}
