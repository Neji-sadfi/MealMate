import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { PlanTabs } from "@/features/meal-plan/components/PlanTabs";
import { RecipeAiStudio } from "@/features/recipes/components/RecipeAiStudio";
import { RecipeCreateForm } from "@/features/recipes/components/RecipeCreateForm";
import { buildRecipeFilter } from "@/lib/recipe-search";
import { DIETS, DIFFICULTIES } from "@/models/enums";
import { Favorite } from "@/models/Favorite";
import { Recipe } from "@/models/Recipe";
import { PhotoHero } from "@/components/ui/PhotoHero";

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
  const tDiet = await getTranslations("pages.profile.enums.diet");
  const userId = await getCurrentUserId();
  const query = await searchParams;
  const favouritesMode = query.view === "favourites";
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
  const favouriteEntries =
    userId && favouritesMode
      ? await Favorite.find({ user: userId }).select("recipe").sort({ createdAt: -1 }).lean()
      : [];
  const favouriteIds = favouriteEntries.map((favorite) => favorite.recipe);
  const favouriteRecipes =
    favouriteIds.length > 0 ? await Recipe.find({ _id: { $in: favouriteIds } }).lean() : [];
  const favouritesById = new Map(favouriteRecipes.map((recipe) => [recipe._id.toString(), recipe]));
  const recipes = favouritesMode
    ? favouriteIds.flatMap((id) => {
        const recipe = favouritesById.get(id.toString());
        return recipe ? [recipe] : [];
      })
    : userId
      ? await Recipe.find(buildRecipeFilter(params)).sort({ createdAt: -1 }).limit(100).lean()
      : [];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
      <PhotoHero
        image="recipes"
        title={favouritesMode ? t("favouritesTitle") : t("title")}
        subtitle={t("subtitle")}
      />
      <PlanTabs active={favouritesMode ? "favourites" : "recipes"} />
      {!favouritesMode && (
        <>
          <RecipeAiStudio />
          <RecipeCreateForm />
          <form
            method="get"
            className="grid grid-cols-2 gap-3 rounded-card border border-border/70 bg-surface p-4 shadow-sm sm:grid-cols-3 lg:grid-cols-4"
          >
            <label className="col-span-2 flex flex-col gap-1 text-sm font-medium sm:col-span-3 lg:col-span-4">
              {t("filters.search")}
              <input
                name="search"
                defaultValue={query.search as string | undefined}
                className="h-11 rounded-input border border-border bg-background px-3"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("filters.diet")}
              <select
                name="diet"
                defaultValue={query.diet as string | undefined}
                className="h-11 rounded-input border border-border bg-background px-3"
              >
                <option value="">{t("filters.any")}</option>
                {DIETS.map((diet) => (
                  <option key={diet} value={diet}>
                    {tDiet(diet)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("filters.difficulty")}
              <select
                name="difficulty"
                defaultValue={query.difficulty as string | undefined}
                className="h-11 rounded-input border border-border bg-background px-3"
              >
                <option value="">{t("filters.any")}</option>
                {DIFFICULTIES.map((difficulty) => (
                  <option key={difficulty} value={difficulty}>
                    {t(`difficulty.${difficulty}`)}
                  </option>
                ))}
              </select>
            </label>
            <input
              name="maxCalories"
              type="number"
              min="0"
              placeholder={t("filters.maxCalories")}
              defaultValue={query.maxCalories as string | undefined}
              className="h-11 rounded-input border border-border bg-background px-3 text-sm"
            />
            <input
              name="minProtein"
              type="number"
              min="0"
              placeholder={t("filters.minProtein")}
              defaultValue={query.minProtein as string | undefined}
              className="h-11 rounded-input border border-border bg-background px-3 text-sm"
            />
            <input
              name="maxCost"
              type="number"
              min="0"
              step="0.01"
              placeholder={t("filters.maxCost")}
              defaultValue={query.maxCost as string | undefined}
              className="h-11 rounded-input border border-border bg-background px-3 text-sm"
            />
            <input
              name="maxTime"
              type="number"
              min="0"
              placeholder={t("filters.maxTime")}
              defaultValue={query.maxTime as string | undefined}
              className="h-11 rounded-input border border-border bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="col-span-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-primary/90 sm:col-span-3 lg:col-span-4"
            >
              {t("filters.submit")}
            </button>
          </form>
        </>
      )}

      {recipes.length === 0 ? (
        <Card>
          <h2 className="font-bold">
            {favouritesMode ? t("favouritesEmptyTitle") : t("noResults.title")}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {favouritesMode ? t("favouritesEmptyBody") : t("noResults.body")}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {recipes.map((recipe) => (
            <Link
              key={recipe._id.toString()}
              href={`/recipes/${recipe._id.toString()}`}
              className="group block"
            >
              <Card className="flex h-full flex-col gap-2 border border-border/70 shadow-sm transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-wide text-muted uppercase">
                      {t(`difficulty.${recipe.difficulty}`)}
                    </p>
                    <h2 className="text-lg font-bold">{recipe.title}</h2>
                  </div>
                  <span className="rounded-full bg-tint px-2 py-1 text-xs font-semibold text-primary">
                    {recipe.prepTimeMinutes} min
                  </span>
                </div>
                <p className="text-sm text-muted">{recipe.tagline}</p>
                <p className="text-xs text-muted">
                  {t("summary", {
                    kcal: recipe.nutrition.calories,
                    protein: recipe.nutrition.protein,
                    cost: recipe.costPerServing,
                  })}
                </p>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  {recipe.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-background px-2 py-1 text-[10px] font-medium tracking-wide text-muted uppercase"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
