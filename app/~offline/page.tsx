import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CalendarDays, Dumbbell, House, Leaf, ShoppingBasket, Users, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/Card";

const navigationItems = [
  { key: "home", href: "/", Icon: House },
  { key: "meals", href: "/meal-plan", Icon: CalendarDays },
  { key: "shopping", href: "/shopping", Icon: ShoppingBasket },
  { key: "sport", href: "/sport", Icon: Dumbbell },
  { key: "community", href: "/community", Icon: Users },
] as const;

async function OfflineNavigation() {
  const t = await getTranslations();
  const nav = await getTranslations("nav");

  return (
    <>
      <header className="sticky top-0 z-30 h-16 border-b border-border/50 bg-background/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 text-lg font-extrabold tracking-tight text-primary"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Leaf aria-hidden className="size-5" />
            </span>
            <span>{t("app.name")}</span>
          </Link>
          <nav
            aria-label={nav("label")}
            className="hidden min-w-0 flex-1 items-center justify-center lg:flex"
          >
            <ul className="flex min-w-0 items-center justify-center gap-1">
              {navigationItems.map(({ key, href, Icon }) => (
                <li key={key} className="min-w-0">
                  <a
                    href={href}
                    title={nav(key)}
                    className="flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold whitespace-nowrap text-muted hover:bg-tint/60 hover:text-primary"
                  >
                    <Icon aria-hidden className="size-4" />
                    <span>{nav(key)}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <span className="size-10 shrink-0" aria-hidden />
        </div>
      </header>
      <div className="fixed inset-x-3 bottom-3 z-20 overflow-hidden rounded-2xl border border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-[0_12px_40px_-16px_rgba(28,43,35,0.28)] backdrop-blur-xl md:sticky md:inset-x-auto md:top-16 md:bottom-auto md:mx-auto md:w-full md:max-w-7xl md:rounded-none md:border-0 md:border-b md:border-border/70 md:bg-background/90 md:px-6 md:pb-0 md:shadow-none md:backdrop-blur lg:hidden">
        <nav aria-label={nav("label")}>
          <ul className="mx-auto flex h-16 max-w-7xl items-stretch justify-around md:hidden">
            {navigationItems.map(({ key, href, Icon }) => (
              <li key={key} className="flex-1">
                <a
                  href={href}
                  className="flex h-full flex-col items-center justify-center gap-1 px-2 text-xs font-semibold text-muted"
                >
                  <span className="flex h-7 w-12 shrink-0 items-center justify-center rounded-full">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <span>{nav(key)}</span>
                </a>
              </li>
            ))}
          </ul>
          <ul className="mx-auto hidden h-14 max-w-7xl items-stretch justify-center gap-1 px-2 md:flex">
            {navigationItems.map(({ key, href, Icon }) => (
              <li key={key} className="min-w-0 flex-1">
                <a
                  href={href}
                  className="flex h-full flex-row items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-muted lg:gap-2 lg:px-3 lg:text-sm"
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="truncate">{nav(key)}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </>
  );
}

// Shown by the service worker when a page is requested offline and is not cached.
export default async function OfflinePage() {
  const t = await getTranslations("offline");

  return (
    <div className="flex min-h-dvh w-full flex-col bg-background">
      <OfflineNavigation />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-28 md:pb-10">
        <Card tone="warning" className="flex flex-col items-center gap-3 text-center">
          <WifiOff aria-hidden className="size-8 text-primary" />
          <h1 className="text-xl font-extrabold">{t("title")}</h1>
          <p className="text-muted">{t("description")}</p>
        </Card>
      </main>
    </div>
  );
}
