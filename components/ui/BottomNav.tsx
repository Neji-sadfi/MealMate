"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  Dumbbell,
  House,
  ShoppingBasket,
  Users,
  type LucideIcon,
} from "lucide-react";

type NavItem = {
  key: "home" | "meals" | "shopping" | "sport" | "community";
  href: string;
  icon: LucideIcon;
  /** Route prefixes that highlight this tab. */
  matches: string[];
};

const items: NavItem[] = [
  { key: "home", href: "/", icon: House, matches: ["/tracking"] },
  { key: "meals", href: "/meal-plan", icon: CalendarDays, matches: ["/meal-plan", "/recipes"] },
  { key: "shopping", href: "/shopping", icon: ShoppingBasket, matches: ["/shopping"] },
  { key: "sport", href: "/sport", icon: Dumbbell, matches: ["/sport"] },
  { key: "community", href: "/community", icon: Users, matches: ["/community"] },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/" && pathname === "/") return true;
  return item.matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-10 mx-auto w-full max-w-md border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.key} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-1 text-xs font-semibold ${
                  active ? "text-primary" : "text-muted hover:text-foreground"
                }`}
              >
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? "bg-tint" : ""}`}
                >
                  <Icon aria-hidden className="size-5" />
                </span>
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
