import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Types } from "mongoose";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import {
  RecipeCreateForm,
  type RecipeEditData,
} from "@/features/recipes/components/RecipeCreateForm";
import { RecipeActions } from "@/features/recipes/components/RecipeActions";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { Favorite } from "@/models/Favorite";
import { Recipe } from "@/models/Recipe";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.recipeDetail");
  return { title: t("title") };
}

export default async function RecipeDetailPage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const recipe = userId && Types.ObjectId.isValid(id) ? await Recipe.findById(id).lean() : null;
  const adminId = userId ? await getCurrentAdminId() : null;
  const isFavorite =
    userId && recipe ? Boolean(await Favorite.exists({ user: userId, recipe: recipe._id })) : false;
  const t = await getTranslations("pages.recipeDetail");

  if (!recipe) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">Recipe not found.</p>
        <Link href="/recipes" className="text-sm font-semibold text-primary">
          Back to recipes
        </Link>
      </div>
    );
  }

  const canManage = Boolean(adminId || recipe.createdBy?.toString() === userId?.toString());
  const editData: RecipeEditData = {
    id: recipe._id.toString(),
    title: recipe.title,
    tagline: recipe.tagline,
    description: recipe.description,
    imageUrl: recipe.imageUrl,
    prepTimeMinutes: recipe.prepTimeMinutes,
    servings: recipe.servings,
    costPerServing: recipe.costPerServing,
    diets: recipe.diets,
    tags: recipe.tags,
    difficulty: recipe.difficulty,
    nutrition: recipe.nutrition,
    ingredients: recipe.ingredients.map(({ name, quantity, unit, note }) => ({
      name,
      quantity,
      unit,
      note,
    })),
    steps: recipe.steps.map(({ title, description }) => ({ title, description })),
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      <Link
        href="/recipes"
        className="w-fit text-sm font-semibold text-primary transition-colors hover:text-primary/70"
      >
        ← Back
      </Link>
      <section className="rounded-card border border-border/70 bg-surface p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
          {recipe.difficulty}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{recipe.title}</h1>
        <p className="mt-2 text-sm text-muted sm:text-base">{recipe.tagline}</p>
      </section>
      {recipe.imageUrl && (
        <Image
          src={recipe.imageUrl}
          alt={recipe.title}
          width={1200}
          height={800}
          unoptimized
          className="max-h-[32rem] w-full rounded-card object-cover shadow-sm"
        />
      )}
      <Card className="border border-border/70 shadow-sm">
        <p className="text-sm leading-relaxed">{recipe.description}</p>
      </Card>
      <Card className="grid grid-cols-2 gap-3 border border-border/70 text-sm shadow-sm sm:grid-cols-3 lg:grid-cols-4">
        <p className="rounded-xl bg-background p-3">
          Servings: <strong>{recipe.servings}</strong>
        </p>
        <p className="rounded-xl bg-background p-3">
          Preparation: <strong>{recipe.prepTimeMinutes} min</strong>
        </p>
        <p className="rounded-xl bg-background p-3">
          Calories: <strong>{recipe.nutrition.calories} kcal</strong>
        </p>
        <p className="rounded-xl bg-background p-3">
          Protein: <strong>{recipe.nutrition.protein} g</strong>
        </p>
        <p className="rounded-xl bg-background p-3">
          Carbs: <strong>{recipe.nutrition.carbs} g</strong>
        </p>
        <p className="rounded-xl bg-background p-3">
          Fat: <strong>{recipe.nutrition.fat} g</strong>
        </p>
        <p className="rounded-xl bg-background p-3 sm:col-span-3 lg:col-span-1">
          Cost / serving: <strong>{recipe.costPerServing}</strong>
        </p>
      </Card>
      <Card className="border border-border/70 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Ingredients</h2>
        <ul className="space-y-2 text-sm">
          {recipe.ingredients.map((ingredient, index) => (
            <li
              key={`${ingredient.name}-${index}`}
              className="flex justify-between gap-2 border-b border-border pb-2 last:border-b-0 last:pb-0"
            >
              <span>{ingredient.name}</span>
              <span className="text-muted">
                {ingredient.quantity ?? "-"} {ingredient.unit}
              </span>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="border border-border/70 shadow-sm">
        <h2 className="mb-3 text-lg font-bold">Steps</h2>
        <ol className="space-y-3 text-sm">
          {recipe.steps.map((step) => (
            <li key={step.order} className="rounded-xl bg-background p-4">
              <p className="font-semibold">{step.title}</p>
              <p className="mt-1 text-muted">{step.description}</p>
            </li>
          ))}
        </ol>
      </Card>
      {canManage && <RecipeCreateForm recipe={editData} />}
      <RecipeActions
        recipeId={recipe._id.toString()}
        title={recipe.title}
        isFavorite={isFavorite}
        canDelete={canManage}
      />
    </div>
  );
}
