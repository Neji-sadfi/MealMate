"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type AppErrorProps = {
  error: unknown;
  /** Next.js 16.3 and later: stable retry callback. */
  retry?: () => void;
  /** Older Next.js versions: reset callback. */
  reset?: () => void;
};

/**
 * Error boundary for every signed-in screen. The text comes from next-intl so
 * nothing is hard-coded, and the button re-runs the failed render.
 *
 * The screens of the meal-plan module catch a database failure themselves
 * (see features/meal-plan/components/ErrorState.tsx): a `loading.tsx` in this
 * segment streams a skeleton and React cannot swap that skeleton for this
 * boundary once it is on screen. This boundary still covers the errors raised
 * while the browser renders the screens.
 */
export default function AppError({ error, retry, reset }: AppErrorProps) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error(error);
  }, [error]);

  const recover = retry ?? reset;

  return (
    <Card tone="warning" className="flex flex-col gap-3">
      <h1 className="text-lg font-extrabold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("body")}</p>
      {recover && <Button onClick={recover}>{t("retry")}</Button>}
    </Card>
  );
}
