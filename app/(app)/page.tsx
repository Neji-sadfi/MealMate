import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { PagePlaceholder } from "@/components/PagePlaceholder";

// Home dashboard. Owner: Member 3. Build the screen in features/meal-plan and replace the placeholder.
export default async function HomePage() {
  const [session, t] = await Promise.all([auth(), getTranslations("pages.home")]);
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  return (
    <PagePlaceholder
      title={t("title", { name: firstName })}
      subtitle={t("subtitle")}
      owner="Member 3"
    />
  );
}
