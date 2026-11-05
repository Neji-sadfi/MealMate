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

function NavigationLinks({ layout }: { layout: "mobile" | "tablet" | "desktop" }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const desktop = layout === "desktop";
  const tablet = layout === "tablet";

  return (
    <nav aria-label={t("label")} className={desktop ? "min-w-0 flex-1" : undefined}>
      <ul
        className={
          desktop
            ? "flex min-w-0 items-center justify-center gap-1"
            : tablet
              ? "mx-auto flex h-14 max-w-7xl items-stretch justify-center gap-1 px-2"
              : "mx-auto flex h-16 max-w-7xl items-stretch justify-around"
        }
      >
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li
              key={item.key}
              className={desktop ? "min-w-0" : tablet ? "min-w-0 flex-1" : "flex-1"}
            >
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                title={desktop ? t(item.key) : undefined}
                onClick={(event) => {
                  if (
                    !navigator.onLine &&
                    event.button === 0 &&
                    !event.metaKey &&
                    !event.ctrlKey &&
                    !event.shiftKey &&
                    !event.altKey
                  ) {
                    event.preventDefault();
                    window.location.assign(item.href);
                  }
                }}
                className={`flex h-full items-center justify-center font-semibold transition-all duration-200 ${
                  desktop
                    ? "gap-1.5 rounded-xl px-2.5 py-2 text-xs whitespace-nowrap xl:gap-2 xl:px-3 xl:text-sm"
                    : tablet
                      ? "flex-row gap-1.5 rounded-xl px-2 text-xs lg:gap-2 lg:px-3 lg:text-sm"
                      : "flex-col gap-1 px-2 text-xs"
                } ${
                  active
                    ? "text-primary md:bg-tint/80"
                    : "text-muted hover:text-primary md:hover:bg-tint/60"
                }`}
              >
                <span
                  className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${
                    desktop ? "size-7" : tablet ? "size-7 lg:size-8" : "h-7 w-12"
                  } ${active ? "bg-tint md:bg-primary/10" : ""}`}
                >
                  <Icon
                    aria-hidden
                    className={`size-5 transition-transform ${desktop || tablet ? "md:size-4" : ""} ${active ? "md:scale-110" : ""}`}
                  />
                </span>
                <span className={desktop ? "truncate" : tablet ? "truncate" : ""}>
                  {t(item.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav() {
  return (
    <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
      <NavigationLinks layout="desktop" />
    </div>
  );
}

export function BottomNav() {
  return (
    <div className="fixed inset-x-3 bottom-3 z-20 overflow-hidden rounded-2xl border border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_40px_-16px_rgba(28,43,35,0.28)] backdrop-blur-xl md:sticky md:inset-x-auto md:top-16 md:bottom-auto md:mx-auto md:w-full md:max-w-7xl md:rounded-none md:border-0 md:border-b md:border-border/70 md:bg-background/90 md:px-6 md:pb-0 md:shadow-none md:backdrop-blur lg:hidden">
      <div className="md:hidden">
        <NavigationLinks layout="mobile" />
      </div>
      <div className="hidden md:block lg:hidden">
        <NavigationLinks layout="tablet" />
      </div>
    </div>
  );
}
