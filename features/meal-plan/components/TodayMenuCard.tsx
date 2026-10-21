"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { PlannedMeal } from "../types";

type TodayMenuCardProps = {
  meals: PlannedMeal[];
};

export function TodayMenuCard({ meals }: TodayMenuCardProps) {
  const t = useTranslations("pages.home.today");
  const mealT = useTranslations("pages.mealPlan");

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold">{t("title")}</h2>
        <Link href="/meal-plan" className="text-sm font-semibold text-primary">
          {t("cta")}
        </Link>
      </div>

      {meals.length === 0 ? (
        <p className="text-sm text-muted">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {meals.map((meal) => (
            <li key={meal.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold">{mealT(`types.${meal.type}`)}</span>
                {meal.time && <span className="text-muted">{meal.time}</span>}
              </span>
              <span className="truncate">{meal.recipe.title}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
