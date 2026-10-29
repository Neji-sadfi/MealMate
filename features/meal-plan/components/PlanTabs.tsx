"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** Local tabs. Swap for shared SegmentedTabs when Member 2 adds it to components/ui. */
export function PlanTabs({ active = "plan" }: { active?: "plan" | "recipes" | "favourites" }) {
  const t = useTranslations("pages.mealPlan.tabs");
  const tabClass = (tab: typeof active) =>
    `flex-1 border-b-2 pb-2 text-center text-sm font-semibold transition-colors ${
      active === tab
        ? "border-primary font-bold text-primary"
        : "border-transparent text-muted hover:text-foreground"
    }`;

  return (
    <nav aria-label={t("label")} className="flex border-b border-border">
      <Link
        href="/meal-plan"
        aria-current={active === "plan" ? "page" : undefined}
        className={tabClass("plan")}
      >
        {t("plan")}
      </Link>
      <Link
        href="/recipes"
        aria-current={active === "recipes" ? "page" : undefined}
        className={tabClass("recipes")}
      >
        {t("recipes")}
      </Link>
      <Link
        href="/recipes?view=favourites"
        aria-current={active === "favourites" ? "page" : undefined}
        className={tabClass("favourites")}
      >
        {t("favourites")}
      </Link>
    </nav>
  );
}
