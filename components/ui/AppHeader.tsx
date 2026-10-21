"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, ChevronLeft, Leaf, ShieldCheck } from "lucide-react";

/** Screens that show "Back" instead of the logo (from the mockup), and where it leads. */
const backRoutes: { pattern: RegExp; href: string }[] = [
  { pattern: /^\/recipes\/[^/]+$/, href: "/recipes" },
  { pattern: /^\/sport\/sessions\/[^/]+$/, href: "/sport" },
  { pattern: /^\/(profile|tracking)$/, href: "/" },
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
  const back = backHref ?? backRoutes.find((route) => route.pattern.test(pathname))?.href;

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between bg-background/95 px-4 backdrop-blur">
      {back ? (
        <Link href={back} className="flex items-center gap-1 font-semibold text-primary">
          <ChevronLeft aria-hidden className="size-5" />
          {t("common.back")}
        </Link>
      ) : (
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-primary">
          <Leaf aria-hidden className="size-5" />
          {t("app.name")}
        </Link>
      )}

      {!minimal && (
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/admin"
              aria-label="Administration"
              title="Administration"
              className="flex size-10 items-center justify-center gap-1 rounded-full bg-tint px-2 text-xs font-semibold text-primary"
            >
              <ShieldCheck aria-hidden className="size-4" />
              Admin
            </Link>
          )}
          {!back && (
            <button
              type="button"
              aria-label={t("common.notifications")}
              className="flex size-10 items-center justify-center rounded-full hover:bg-tint"
            >
              <Bell aria-hidden className="size-5" />
            </button>
          )}
          <Link
            href="/profile"
            aria-label={t("common.profile")}
            className="flex size-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground"
          >
            {initials}
          </Link>
        </div>
      )}
    </header>
  );
}
