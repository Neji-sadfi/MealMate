import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { RecipeCreateForm } from "@/features/recipes/components/RecipeCreateForm";
import { buildRecipeFilter } from "@/lib/recipe-search";
import { DIETS, DIFFICULTIES } from "@/models/enums";
import { Recipe } from "@/models/Recipe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.recipes");
  return { title: t("title") };
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const t = await getTranslations("pages.recipes");
  const userId = await getCurrentUserId();
  const query = await searchParams;
  const params = new URLSearchParams();
  for (const key of [
    "search",
    "diet",
    "maxCalories",
    "minProtein",
    "maxCost",
    "difficulty",
    "maxTime",
  ]) {
    const value = query[key];
    if (typeof value === "string") params.set(key, value);
  }
  const recipes = userId
    ? await Recipe.find(buildRecipeFilter(params)).sort({ createdAt: -1 }).limit(100).lean()
    : [];

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>
      <RecipeCreateForm />
      <form method="get" className="grid grid-cols-2 gap-3 rounded-card bg-surface p-4">
        <label className="col-span-2 flex flex-col gap-1 text-sm font-medium">
          Search
          <input
            name="search"
            defaultValue={query.search as string | undefined}
            className="h-11 rounded-input border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Diet
          <select
            name="diet"
            defaultValue={query.diet as string | undefined}
            className="h-11 rounded-input border border-border bg-background px-3"
          >
            <option value="">Any</option>
            {DIETS.map((diet) => (
              <option key={diet} value={diet}>
                {diet}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Difficulty
          <select
            name="difficulty"
            defaultValue={query.difficulty as string | undefined}
            className="h-11 rounded-input border border-border bg-background px-3"
          >
            <option value="">Any</option>
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </label>
        <input
          name="maxCalories"
          type="number"
          min="0"
          placeholder="Max kcal / serving"
          defaultValue={query.maxCalories as string | undefined}
          className="h-11 rounded-input border border-border bg-background px-3 text-sm"
        />
        <input
          name="minProtein"
          type="number"
          min="0"
          placeholder="Min protein (g)"
          defaultValue={query.minProtein as string | undefined}
          className="h-11 rounded-input border border-border bg-background px-3 text-sm"
        />
        <input
          name="maxCost"
          type="number"
          min="0"
          step="0.01"
          placeholder="Max cost / serving"
          defaultValue={query.maxCost as string | undefined}
          className="h-11 rounded-input border border-border bg-background px-3 text-sm"
        />
        <input
          name="maxTime"
          type="number"
          min="0"
          placeholder="Max prep time (min)"
          defaultValue={query.maxTime as string | undefined}
          className="h-11 rounded-input border border-border bg-background px-3 text-sm"
        />
        <button
          type="submit"
          className="col-span-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white"
        >
          Search recipes
        </button>
      </form>

      {recipes.length === 0 ? (
        <Card>
          <h2 className="font-bold">No matching recipes</h2>
          <p className="mt-1 text-sm text-muted">
            Try adjusting your search or filters, or create a new recipe.
          </p>
        </Card>
      ) : (
        recipes.map((recipe) => (
          <Link
            key={recipe._id.toString()}
            href={`/recipes/${recipe._id.toString()}`}
            className="block"
          >
            <Card className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs tracking-wide text-muted uppercase">{recipe.difficulty}</p>
                  <h2 className="text-lg font-bold">{recipe.title}</h2>
                </div>
                <span className="rounded-full bg-tint px-2 py-1 text-xs font-semibold text-primary">
                  {recipe.prepTimeMinutes} min
                </span>
              </div>
              <p className="text-sm text-muted">{recipe.tagline}</p>
              <p className="text-xs text-muted">
                {recipe.nutrition.calories} kcal · {recipe.nutrition.protein}g protein ·{" "}
                {recipe.costPerServing} / serving
              </p>
              <div className="flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-surface px-2 py-1 text-[10px] font-medium tracking-wide text-muted uppercase"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
