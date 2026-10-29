import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CoachChat } from "@/features/coach/components/CoachChat";
import { loadCoachHistory } from "@/features/coach/services/history";
import { getCurrentUserId } from "@/lib/current-user";
import { PhotoHero } from "@/components/ui/PhotoHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("coach");
  return { title: t("title") };
}

export default async function CoachPage() {
  const t = await getTranslations("common");
  const tCoach = await getTranslations("coach");
  const userId = await getCurrentUserId();
  const history = userId ? await loadCoachHistory(userId).catch(() => []) : [];

  return (
    <div className="flex flex-col gap-2">
      <Link href="/profile" className="flex w-fit items-center gap-1 font-semibold text-primary">
        <ChevronLeft aria-hidden className="size-5" />
        {t("back")}
      </Link>
      <PhotoHero image="community" title={tCoach("title")} subtitle={tCoach("subtitle")} />
      <CoachChat initialMessages={history} />
    </div>
  );
}
