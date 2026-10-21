"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type RecipeOption = { id: string; title: string };

export function MealPlanActions({ recipes }: { recipes: RecipeOption[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/meal-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: data.get("date"),
        recipe: data.get("recipe"),
        type: data.get("type"),
        servings: Number(data.get("servings") || 1),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not save this meal.");
      setPending(false);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  async function generate() {
    setGenerating(true);
    setError("");
    const response = await fetch("/api/meal-plans/generate", { method: "POST" });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not generate a meal plan.");
      setGenerating(false);
      return;
    }
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="secondary" fullWidth disabled={generating || recipes.length === 0} onClick={() => void generate()}>
        {generating ? "Generating..." : "Generate a week of meals"}
      </Button>
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <h2 className="font-bold">Plan a meal</h2>
        {recipes.length === 0 ? <p className="text-sm text-muted">Create a recipe before adding it to your plan.</p> : (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">Recipe<select name="recipe" required className="h-12 rounded-input border border-border bg-background px-3">{recipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.title}</option>)}</select></label>
            <label className="flex flex-col gap-1 text-sm font-medium">Date<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="h-12 rounded-input border border-border bg-background px-3" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm font-medium">Meal<select name="type" className="h-12 rounded-input border border-border bg-background px-3"><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
              <label className="flex flex-col gap-1 text-sm font-medium">Servings<input name="servings" type="number" min="1" max="20" defaultValue="1" className="h-12 rounded-input border border-border bg-background px-3" /></label>
            </div>
            <Button type="submit" fullWidth disabled={pending}>{pending ? "Saving..." : "Add to plan"}</Button>
          </>
        )}
      </form>
      {error && <p role="alert" className="text-sm text-warning">{error}</p>}
    </div>
  );
}
