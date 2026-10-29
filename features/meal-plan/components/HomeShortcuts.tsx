"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Dumbbell, ShoppingCart, Users, UtensilsCrossed, type LucideIcon } from "lucide-react";

const shortcuts: { key: "meals" | "shopping" | "sport" | "community"; href: string; icon: LucideIcon }[] = [
  { key: "meals", href: "/meal-plan", icon: UtensilsCrossed },
  { key: "shopping", href: "/shopping", icon: ShoppingCart },
  { key: "sport", href: "/sport", icon: Dumbbell },
  { key: "community", href: "/community", icon: Users },
];

export function HomeShortcuts() {
  const t = useTranslations("pages.home.shortcuts");

  return (
    <nav aria-label={t("label")} className="grid grid-cols-2 gap-3">
      {shortcuts.map(({ key, href, icon: Icon }) => (
        <Link
          key={key}
          href={href}
          className="flex items-center gap-2 rounded-card bg-surface p-3 text-sm font-semibold shadow-sm"
        >
          <Icon aria-hidden className="size-4 shrink-0 text-primary" />
          {t(key)}
        </Link>
      ))}
    </nav>
  );
}
