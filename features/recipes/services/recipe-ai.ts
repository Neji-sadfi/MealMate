import { generateText, Output } from "ai";
import { generatedRecipeSchema, type RecipeAiRequest } from "@/features/recipes/ai-schemas";
import { getGeminiModel } from "@/lib/ai";
import type { Locale } from "@/lib/i18n/config";
import type { IUserPreferences } from "@/models/User";

const DIET_LABELS: Record<IUserPreferences["diet"], string> = {
  none: "No specific diet",
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  gluten_free: "Gluten-free",
  lactose_free: "Lactose-free",
  low_carb: "Low-carb",
};

const GOAL_LABELS: Record<IUserPreferences["goal"], string> = {
  maintenance: "Weight maintenance",
  weight_loss: "General weight-management support",
  muscle_gain: "Muscle-building food ideas",
  balanced: "Balanced eating",
};

function preferenceContext(preferences: IUserPreferences) {
  return [
    `Diet: ${DIET_LABELS[preferences.diet]}.`,
    `Allergies to avoid: ${preferences.allergies.length ? preferences.allergies.join(", ") : "none recorded"}.`,
    `Intolerances to avoid: ${preferences.intolerances.length ? preferences.intolerances.join(", ") : "none recorded"}.`,
    `Food goal: ${GOAL_LABELS[preferences.goal]}.`,
  ].join("\n");
}

const safetyInstructions = [
  "You provide general cooking inspiration only, never medical, clinical, or individualized treatment advice.",
  "Do not prescribe calorie deficits, diagnose conditions, or promise health outcomes.",
  "Respect every listed allergy and intolerance strictly. Remind users to verify product labels and cross-contamination risks.",
  "Never claim nutrition or price figures are exact; clearly describe them as estimates.",
  "If asked for medical dietary advice, briefly recommend consulting a qualified healthcare professional.",
].join(" ");

function recipePrompt(
  request: Extract<RecipeAiRequest, { mode: "generate" }>,
  preferences: IUserPreferences,
  locale: Locale,
) {
  return [
    `Create one practical recipe. Write all user-facing text in ${locale === "fr" ? "French" : "English"}.`,
    `Use exactly ${request.servings} servings and keep preparation within ${request.maxTime} minutes.`,
    request.ingredients ? `Prefer these available ingredients: ${request.ingredients}.` : "",
    request.goal ? `Recipe preference: ${request.goal}.` : "",
    "Use only the ingredient units and diet identifiers supported by the schema. Nutrition and cost are rough estimates, not verified facts.",
    `Estimated cost per serving is in ${preferences.currency}.`,
    `User food preferences:\n${preferenceContext(preferences)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function chatSystemPrompt(preferences: IUserPreferences, locale: Locale) {
  return [
    "You are MealMate's friendly food and recipe assistant.",
    `Answer clearly and practically in ${locale === "fr" ? "French" : "English"}.`,
    `User food preferences:\n${preferenceContext(preferences)}`,
    `Safety: ${safetyInstructions}`,
  ].join("\n\n");
}

function providerStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  if ("status" in error && typeof error.status === "number") return error.status;
  return undefined;
}

function aiErrorCode(error: unknown): string {
  if (error instanceof Error && error.message === "AI_NOT_CONFIGURED") return "AI_NOT_CONFIGURED";
  if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError"))
    return "AI_TIMEOUT";

  const status = providerStatus(error);
  if (status === 401 || status === 403) return "AI_KEY_INVALID";
  if (status === 429) return "AI_RATE_LIMITED";
  return "AI_PROVIDER_ERROR";
}

export async function requestRecipeAi(
  request: RecipeAiRequest,
  preferences: IUserPreferences,
  locale: Locale,
): Promise<{ recipe: unknown } | { answer: string }> {
  try {
    const model = getGeminiModel();
    const abortSignal = AbortSignal.timeout(45_000);

    if (request.mode === "generate") {
      const { output } = await generateText({
        model,
        output: Output.object({ schema: generatedRecipeSchema }),
        system: [
          "Return a valid recipe matching the provided schema.",
          `Safety: ${safetyInstructions}`,
        ].join(" "),
        prompt: recipePrompt(request, preferences, locale),
        maxOutputTokens: 1800,
        temperature: 0.6,
        abortSignal,
      });
      if (!output) throw new Error("AI_INVALID_RESPONSE");
      return { recipe: output };
    }

    const { text } = await generateText({
      model,
      system: chatSystemPrompt(preferences, locale),
      messages: [
        ...request.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        { role: "user", content: request.message },
      ],
      maxOutputTokens: 600,
      temperature: 0.5,
      abortSignal,
    });
    if (!text.trim()) throw new Error("AI_INVALID_RESPONSE");
    return { answer: text.trim() };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("AI_")) throw error;
    console.error("recipe assistant provider request failed", {
      mode: request.mode,
      name: error instanceof Error ? error.name : "UnknownError",
      status: providerStatus(error),
    });
    throw new Error(aiErrorCode(error));
  }
}
