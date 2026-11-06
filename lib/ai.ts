import { createGoogle } from "@ai-sdk/google";

const DEFAULT_MODEL = "gemini-3.6-flash";

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("AI_NOT_CONFIGURED");

  const google = createGoogle({ apiKey });
  return google(process.env.GEMINI_MODEL ?? DEFAULT_MODEL);
}
