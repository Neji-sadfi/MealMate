"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

/** Local tabs. Swap for shared SegmentedTabs when Member 2 adds it to components/ui. */
export function PlanTabs() {
  const t = useTranslations("pages.mealPlan.tabs");

  return (
    <nav aria-label={t("label")} className="flex border-b border-border">
      <span className="flex-1 border-b-2 border-primary pb-2 text-center text-sm font-bold text-primary">
        {t("plan")}
      </span>
      <Link
        href="/recipes"
        className="flex-1 pb-2 text-center text-sm font-semibold text-muted hover:text-foreground"
      >
        {t("recipes")}
      </Link>
      <Link
        href="/recipes"
        className="flex-1 pb-2 text-center text-sm font-semibold text-muted hover:text-foreground"
      >
        {t("favourites")}
      </Link>
    </nav>
  );
}
