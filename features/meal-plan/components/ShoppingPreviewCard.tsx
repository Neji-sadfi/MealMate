"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import type { DashboardShopping } from "../types";

type ShoppingPreviewCardProps = {
  shopping: DashboardShopping;
};

export function ShoppingPreviewCard({ shopping }: ShoppingPreviewCardProps) {
  const t = useTranslations("pages.home.shopping");
  const hasItems = shopping.count > 0;

  return (
    <Link href="/shopping" aria-label={t("cta")} className="block">
      <Card className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-extrabold">{t("title")}</h2>
          <p className="text-sm text-muted">
            {hasItems ? t("items", { count: shopping.count }) : t("empty")}
          </p>
          {hasItems && (
            <p className="text-sm font-semibold text-primary">
              {t("estimated", { amount: shopping.estimatedTotal })}
            </p>
          )}
        </div>
        <ShoppingCart aria-hidden className="size-6 shrink-0 text-primary" />
      </Card>
    </Link>
  );
}
