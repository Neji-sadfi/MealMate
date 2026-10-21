"use client";

import { TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { daysBetweenIso } from "../services/week";
import type { DashboardExpiry } from "../types";

type ExpiryAlertBannerProps = {
  expiry: DashboardExpiry;
  todayISO: string;
};

export function ExpiryAlertBanner({ expiry, todayISO }: ExpiryAlertBannerProps) {
  const t = useTranslations("pages.home.expiry");
  if (!expiry) return null;

  // Both dates are local calendar days, so the count is exact.
  const days = Math.max(0, daysBetweenIso(todayISO, expiry.expiresOn));

  return (
    <Card tone="warning" className="flex items-start gap-3">
      <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-extrabold">{t("title")}</h2>
        <p className="text-sm">
          {t("expiresIn", {
            name: expiry.name,
            quantity: expiry.quantity,
            unit: expiry.unit,
            days,
          })}
        </p>
      </div>
    </Card>
  );
}
