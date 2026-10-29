import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { HomeScreen } from "@/features/meal-plan/components/HomeScreen";
import { ErrorState } from "@/features/meal-plan/components/ErrorState";
import { getDashboardData } from "@/features/meal-plan/services/dashboard-service";
import { toISODate } from "@/features/meal-plan/services/week";

// Home dashboard. Owner: Member 3 (Nada).
// The dashboard is aggregated on the server for the signed-in user (no HTTP
// round trip) and "today" changes every request: never cache statically.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("home") };
}

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // One single "now" for the whole request: the dashboard and the header
  // must never disagree about which day it is.
  const now = new Date();
  const todayISO = toISODate(now);

  // The dashboard needs the database: when it is unreachable the screen says
  // so instead of crashing (see the ErrorState component).
  let data: Awaited<ReturnType<typeof getDashboardData>>;
  try {
    data = await getDashboardData(session.user.id, now);
  } catch (error) {
    console.error("[meal-plan] home screen unavailable", error);
    return <ErrorState />;
  }

  const firstName = session.user.name?.split(" ")[0] ?? "";
  return <HomeScreen firstName={firstName} todayISO={todayISO} data={data} />;
}
