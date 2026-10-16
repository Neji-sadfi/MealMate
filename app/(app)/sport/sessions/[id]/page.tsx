import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/PagePlaceholder";

// Owner: Member 6. Build the screen in features/sport and replace the placeholder.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.workoutSession");
  return { title: t("title") };
}

export default async function WorkoutSessionPage({ params }: PageProps<"/sport/sessions/[id]">) {
  const { id } = await params;
  const t = await getTranslations("pages.workoutSession");

  return <PagePlaceholder title={t("title")} subtitle={t("subtitle", { id })} owner="Member 6" />;
}
