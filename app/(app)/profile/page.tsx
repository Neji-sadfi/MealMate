import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/PagePlaceholder";
import { SignOutButton } from "@/features/auth/components/SignOutButton";

// Owner: Member 1. Build the profile form in features/auth and replace the placeholder.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.profile");
  return { title: t("title") };
}

export default function ProfilePage() {
  const t = useTranslations("pages.profile");

  return (
    <div className="flex flex-col gap-6">
      <PagePlaceholder title={t("title")} subtitle={t("subtitle")} owner="Member 1" />
      <SignOutButton />
    </div>
  );
}
