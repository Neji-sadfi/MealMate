"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { DIETS, DIFFICULTIES, UNITS } from "@/models/enums";

type IngredientDraft = {
  name: string;
  quantity: string;
  unit: (typeof UNITS)[number];
  note: string;
};

type StepDraft = {
  title: string;
  description: string;
};

export type RecipeEditData = {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  imageUrl?: string;
  prepTimeMinutes: number;
  servings: number;
  costPerServing: number;
  diets: Array<(typeof DIETS)[number]>;
  tags: string[];
  difficulty: (typeof DIFFICULTIES)[number];
  nutrition: { calories: number; protein: number; carbs: number; fat: number };
  ingredients: Array<{
    name: string;
    quantity?: number;
    unit: IngredientDraft["unit"];
    note?: string;
  }>;
  steps: Array<{ title: string; description: string }>;
};

export function RecipeCreateForm({ recipe }: { recipe?: RecipeEditData }) {
  const router = useRouter();
  const t = useTranslations("pages.recipes.form");
  const tRecipes = useTranslations("pages.recipes");
  const tDiet = useTranslations("pages.profile.enums.diet");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ingredients, setIngredients] = useState<IngredientDraft[]>(
    recipe?.ingredients.map((ingredient) => ({
      ...ingredient,
      quantity: ingredient.quantity === undefined ? "" : String(ingredient.quantity),
      note: ingredient.note ?? "",
    })) ?? [],
  );
  const [steps, setSteps] = useState<StepDraft[]>(
    recipe?.steps.map(({ title, description }) => ({ title, description })) ?? [],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch(recipe ? `/api/recipes/${recipe.id}` : "/api/recipes", {
        method: recipe ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.get("title"),
          tagline: data.get("tagline"),
          description: data.get("description"),
          imageUrl: data.get("imageUrl") || undefined,
          diets: data.getAll("diets"),
          tags: String(data.get("tags") ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          difficulty: data.get("difficulty"),
          prepTimeMinutes: Number(data.get("prepTimeMinutes")),
          servings: Number(data.get("servings")),
          costPerServing: Number(data.get("costPerServing")),
          nutrition: {
            calories: Number(data.get("calories")),
            protein: Number(data.get("protein")),
            carbs: Number(data.get("carbs")),
            fat: Number(data.get("fat")),
          },
          ingredients: ingredients
            .filter((ingredient) => ingredient.name.trim())
            .map((ingredient) => ({
              name: ingredient.name.trim(),
              quantity: ingredient.quantity ? Number(ingredient.quantity) : undefined,
              unit: ingredient.unit,
              note: ingredient.note.trim() || undefined,
            })),
          steps: steps
            .filter((step) => step.title.trim() || step.description.trim())
            .map((step, index) => ({
              order: index + 1,
              title: step.title.trim(),
              description: step.description.trim(),
            })),
        }),
      });
      if (!response.ok) {
        setError(t("saveError"));
        return;
      }
      if (!recipe) {
        form.reset();
        setIngredients([]);
        setSteps([]);
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <details open={Boolean(recipe)} className="rounded-card bg-surface p-4">
      <summary className="cursor-pointer font-bold">
        {recipe ? t("editTitle") : t("createTitle")}
      </summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Input
          name="title"
          label={t("name")}
          defaultValue={recipe?.title}
          required
          minLength={2}
          maxLength={120}
        />
        <Input name="tagline" label={t("tagline")} defaultValue={recipe?.tagline} maxLength={160} />
        <label className="flex flex-col gap-1 text-sm font-medium">
          {t("description")}
          <textarea
            name="description"
            defaultValue={recipe?.description}
            rows={3}
            maxLength={2000}
            className="rounded-input border border-border bg-background p-3"
          />
        </label>
        <Input
          name="imageUrl"
          type="url"
          label={t("imageUrl")}
          defaultValue={recipe?.imageUrl}
          maxLength={2048}
          placeholder="https://example.com/recipe-photo.jpg"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("difficulty")}
            <select
              name="difficulty"
              defaultValue={recipe?.difficulty ?? "easy"}
              className="h-12 w-full rounded-input border border-border bg-surface px-4 text-foreground"
            >
              {DIFFICULTIES.map((difficulty) => (
                <option key={difficulty} value={difficulty}>
                  {tRecipes(`difficulty.${difficulty}`)}
                </option>
              ))}
            </select>
          </label>
          <Input
            name="tags"
            label={t("tags")}
            defaultValue={recipe?.tags.join(", ")}
            placeholder={t("tagsPlaceholder")}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("diets")}
          <select
            name="diets"
            multiple
            defaultValue={recipe?.diets ?? []}
            className="min-h-24 w-full rounded-input border border-border bg-surface px-4 py-2 text-foreground"
          >
            {DIETS.map((diet) => (
              <option key={diet} value={diet}>
                {tDiet(diet)}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted">{t("dietsHelp")}</span>
        </label>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("ingredients")}</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setIngredients((current) => [
                  ...current,
                  { name: "", quantity: "", unit: "g", note: "" },
                ])
              }
            >
              {t("addIngredient")}
            </Button>
          </div>
          {ingredients.map((ingredient, index) => (
            <div key={index} className="rounded-xl border border-border p-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t("ingredient")}
                  value={ingredient.name}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item,
                      ),
                    )
                  }
                  required
                  maxLength={120}
                  placeholder={t("ingredientPlaceholder")}
                />
                <Input
                  label={t("quantity")}
                  type="number"
                  min="0"
                  step="any"
                  value={ingredient.quantity}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, quantity: event.target.value } : item,
                      ),
                    )
                  }
                />
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {t("unit")}
                  <select
                    value={ingredient.unit}
                    onChange={(event) =>
                      setIngredients((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, unit: event.target.value as IngredientDraft["unit"] }
                            : item,
                        ),
                      )
                    }
                    className="h-12 w-full rounded-input border border-border bg-surface px-4 text-foreground"
                  >
                    {UNITS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label={t("note")}
                  value={ingredient.note}
                  onChange={(event) =>
                    setIngredients((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, note: event.target.value } : item,
                      ),
                    )
                  }
                  maxLength={200}
                  placeholder={t("notePlaceholder")}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() =>
                  setIngredients((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                {t("removeIngredient")}
              </Button>
            </div>
          ))}
          {ingredients.length === 0 && (
            <p className="text-sm text-muted">{t("ingredientsEmpty")}</p>
          )}
        </section>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t("steps")}</h2>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSteps((current) => [...current, { title: "", description: "" }])}
            >
              {t("addStep")}
            </Button>
          </div>
          {steps.map((step, index) => (
            <div key={index} className="rounded-xl border border-border p-3">
              <Input
                label={t("stepTitle", { number: index + 1 })}
                value={step.title}
                onChange={(event) =>
                  setSteps((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, title: event.target.value } : item,
                    ),
                  )
                }
                required
                maxLength={120}
                placeholder={t("stepPlaceholder")}
              />
              <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
                {t("instructions")}
                <textarea
                  value={step.description}
                  onChange={(event) =>
                    setSteps((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, description: event.target.value } : item,
                      ),
                    )
                  }
                  rows={3}
                  maxLength={1000}
                  required
                  className="rounded-input border border-border bg-background p-3"
                  placeholder={t("instructionsPlaceholder")}
                />
              </label>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() =>
                  setSteps((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
              >
                {t("removeStep")}
              </Button>
            </div>
          ))}
          {steps.length === 0 && <p className="text-sm text-muted">{t("stepsEmpty")}</p>}
        </section>
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="prepTimeMinutes"
            label={t("minutes")}
            type="number"
            min="1"
            defaultValue={recipe?.prepTimeMinutes ?? 20}
            required
          />
          <Input
            name="servings"
            label={t("servings")}
            type="number"
            min="1"
            defaultValue={recipe?.servings ?? 1}
            required
          />
          <Input
            name="costPerServing"
            label={t("costPerServing")}
            type="number"
            min="0"
            step="any"
            defaultValue={recipe?.costPerServing ?? 0}
            required
          />
          <Input
            name="calories"
            label={t("calories")}
            type="number"
            min="0"
            defaultValue={recipe?.nutrition.calories ?? 0}
            required
          />
          <Input
            name="protein"
            label={t("protein")}
            type="number"
            min="0"
            defaultValue={recipe?.nutrition.protein ?? 0}
            required
          />
          <Input
            name="carbs"
            label={t("carbs")}
            type="number"
            min="0"
            defaultValue={recipe?.nutrition.carbs ?? 0}
            required
          />
          <Input
            name="fat"
            label={t("fat")}
            type="number"
            min="0"
            defaultValue={recipe?.nutrition.fat ?? 0}
            required
          />
        </div>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? t("saving") : recipe ? t("saveChanges") : t("save")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-warning">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
