"use client";

import { ArrowLeftRight, Pencil, Trash2, Utensils } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { PlannedMeal } from "../types";

type MealCardProps = {
  meal: PlannedMeal;
  onEdit: () => void;
  onMove: () => void;
  onRemove: () => void;
};

export function MealCard({ meal, onEdit, onMove, onRemove }: MealCardProps) {
  const t = useTranslations("pages.mealPlan");
  const calories = meal.recipe.calories * meal.servings;
  const protein = meal.recipe.protein * meal.servings;
  const typeLabel = meal.time
    ? `${t(`types.${meal.type}`)} · ${meal.time}`
    : t(`types.${meal.type}`);

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-xs font-bold tracking-wide text-muted uppercase">{typeLabel}</p>
      <div className="flex gap-3">
        <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-tint">
          {meal.recipe.imageUrl ? (
            // next/image needs remotePatterns in next.config (out of scope).
            // eslint-disable-next-line @next/next/no-img-element
            <img src={meal.recipe.imageUrl} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-primary">
              <Utensils aria-hidden className="size-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-extrabold">{meal.recipe.title}</h3>
          <p className="text-sm text-muted">{t("kcalProtein", { kcal: calories, protein })}</p>
          <p className="text-sm text-muted">{t("portion", { count: meal.servings })}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Pencil aria-hidden className="size-3.5" />
          {t("edit")}
        </button>
        <button
          type="button"
          onClick={onMove}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <ArrowLeftRight aria-hidden className="size-3.5" />
          {t("move")}
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary"
        >
          <Trash2 aria-hidden className="size-3.5" />
          {t("remove")}
        </button>
      </div>
    </Card>
  );
}
