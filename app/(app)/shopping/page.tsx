import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/PagePlaceholder";

// Owner: Member 4. Build the screen in features/ and replace the placeholder.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.shopping");
  return { title: t("title") };
}

export default function ShoppingPage() {
  const t = useTranslations("pages.shopping");
  return <PagePlaceholder title={t("title")} subtitle={t("subtitle")} owner="Member 4" />;
}
