"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronLeft, Leaf, ShieldCheck } from "lucide-react";
import { DesktopNav } from "@/components/ui/BottomNav";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";

/** Routes whose back destination is not their immediate parent URL. */
const backRoutes: { pattern: RegExp; href: string }[] = [
  { pattern: /^\/recipes\/[^/]+$/, href: "/recipes" },
  { pattern: /^\/sport\/sessions\/[^/]+$/, href: "/sport" },
  { pattern: /^\/(register|forgot-password|reset-password|verify-email)(\/.*)?$/, href: "/login" },
];

type AppHeaderProps = {
  /** Force a "Back" link to this URL. By default it is derived from the current route. */
  backHref?: string;
  /** Initials shown in the avatar, e.g. "AB". */
  initials?: string;
  isAdmin?: boolean;
  /** Hide the bell and avatar (auth screens). */
  minimal?: boolean;
};

export function AppHeader({
  backHref,
  initials,
  isAdmin = false,
  minimal = false,
}: AppHeaderProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const knownBackHref = backRoutes.find((route) => route.pattern.test(pathname))?.href;
  const parentPath = pathname.split("/").slice(0, -1).join("/") || "/";
  const back = backHref ?? knownBackHref ?? (pathname === "/" ? undefined : parentPath);

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-2 sm:gap-4">
        {back ? (
          <Link href={back} className="flex shrink-0 items-center gap-1 font-semibold text-primary">
            <ChevronLeft aria-hidden className="size-5" />
            {t("common.back")}
          </Link>
        ) : (
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5 text-lg font-extrabold tracking-tight text-primary"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:-rotate-6">
              <Leaf aria-hidden className="size-5" />
            </span>
            <span>{t("app.name")}</span>
          </Link>
        )}

        {!minimal && <DesktopNav />}

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LocaleSwitcher />
          {!minimal && (
            <>
              {isAdmin && (
                <Link
                  href="/admin"
                  aria-label="Administration"
                  title="Administration"
                  className="flex size-10 items-center justify-center gap-1 rounded-full bg-tint/80 px-2 text-xs font-semibold text-primary transition-colors hover:bg-tint sm:w-auto sm:gap-2 sm:px-3"
                >
                  <ShieldCheck aria-hidden className="size-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <button
                type="button"
                aria-label={t("common.notifications")}
                className="flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-tint hover:text-primary"
              >
                <Bell aria-hidden className="size-5" />
              </button>
              <Link
                href="/profile"
                aria-label={t("common.profile")}
                className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm ring-2 ring-primary/10 transition-transform hover:scale-105"
              >
                {initials}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
