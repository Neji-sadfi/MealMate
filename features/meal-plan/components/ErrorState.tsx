"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

/**
 * Shown when a screen cannot load its data.
 *
 * The screens catch the failure themselves instead of letting it reach React:
 * a `loading.tsx` in the same segment streams a Suspense fallback, and once
 * that fallback is on screen React can no longer swap it for the error
 * boundary, so the user would keep looking at the skeleton. Catching the
 * failure here keeps both: the skeleton while the data loads and a real
 * message when it cannot be loaded.
 *
 * "Try again" asks the server for the screen again.
 */
export function ErrorState() {
  const t = useTranslations("errors");
  const router = useRouter();

  return (
    <Card tone="warning" className="flex flex-col gap-3">
      <h1 className="text-lg font-extrabold">{t("title")}</h1>
      <p className="text-sm text-muted">{t("body")}</p>
      <Button onClick={() => router.refresh()}>{t("retry")}</Button>
    </Card>
  );
}
