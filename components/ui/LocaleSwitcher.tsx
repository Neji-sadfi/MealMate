"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { setLocaleAction } from "@/app/actions/locale";
import type { Locale } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("common");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function chooseLocale(nextLocale: Locale) {
    if (nextLocale === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(nextLocale);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className="flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-surface p-1"
    >
      {(["fr", "en"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={locale === option}
          disabled={pending}
          onClick={() => chooseLocale(option)}
          className={`min-w-9 rounded-full px-2 py-1.5 text-xs font-bold uppercase transition-colors disabled:opacity-60 ${
            locale === option
              ? "bg-primary text-primary-foreground"
              : "text-muted hover:text-primary"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
