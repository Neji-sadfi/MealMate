import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { generatedRecipeSchema, recipeAiRequestSchema } from "@/features/recipes/ai-schemas";
import { requestRecipeAi } from "@/features/recipes/services/recipe-ai";
import { getCurrentUserId } from "@/lib/current-user";
import { User } from "@/models/User";

export const maxDuration = 60;
export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body: unknown = await request.json().catch(() => null);
  const parsed = recipeAiRequestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });

  const user = await User.findById(userId).select("preferences").lean();
  if (!user) return NextResponse.json({ error: "USER_NOT_FOUND" }, { status: 404 });

  try {
    const locale = await getLocale();
    const result = await requestRecipeAi(parsed.data, user.preferences, locale);
    if ("recipe" in result) {
      const recipe = generatedRecipeSchema.safeParse(result.recipe);
      if (!recipe.success)
        return NextResponse.json({ error: "AI_INVALID_RECIPE" }, { status: 502 });
      if (
        parsed.data.mode === "generate" &&
        (recipe.data.servings !== parsed.data.servings ||
          recipe.data.prepTimeMinutes > parsed.data.maxTime)
      ) {
        return NextResponse.json({ error: "AI_INVALID_RECIPE" }, { status: 502 });
      }
      return NextResponse.json({ recipe: recipe.data });
    }
    return NextResponse.json(result);
  } catch (error) {
    const code = error instanceof Error ? error.message : "AI_PROVIDER_ERROR";
    const statuses: Record<string, number> = {
      AI_NOT_CONFIGURED: 503,
      AI_KEY_INVALID: 503,
      AI_RATE_LIMITED: 429,
      AI_TIMEOUT: 504,
      AI_UNAVAILABLE: 502,
      AI_PROVIDER_ERROR: 502,
      AI_INVALID_RESPONSE: 502,
    };
    return NextResponse.json(
      { error: code in statuses ? code : "AI_PROVIDER_ERROR" },
      { status: statuses[code] ?? 502 },
    );
  }
}
