import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/PagePlaceholder";

// Owner: Member 2. Build the screen in features/recipes and replace the placeholder.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.recipeDetail");
  return { title: t("title") };
}

export default async function RecipeDetailPage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const t = await getTranslations("pages.recipeDetail");

  return <PagePlaceholder title={t("title")} subtitle={t("subtitle", { id })} owner="Member 2" />;
}
