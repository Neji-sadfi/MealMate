import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { PagePlaceholder } from "@/components/PagePlaceholder";

// TODO(Member 1): reset-password form calling POST /api/auth/forgot-password.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.forgotPassword");
  return { title: t("title") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");

  return (
    <div className="flex flex-col gap-6">
      <PagePlaceholder title={t("title")} subtitle={t("intro")} owner="Member 1" />
      <Link href="/login" className="text-center text-sm font-semibold text-primary">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
