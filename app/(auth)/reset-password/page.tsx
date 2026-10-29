import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";
import { isAuthTokenValid } from "@/features/auth/services/tokens";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.resetPassword");
  return { title: t("title") };
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const t = await getTranslations("auth.resetPassword");
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  const valid = await isAuthTokenValid(value, "password_reset");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{valid ? t("intro") : t("invalidIntro")}</p>
      </div>

      {valid ? (
        <Card>
          <ResetPasswordForm token={value} />
        </Card>
      ) : (
        <Link
          href="/forgot-password"
          className="flex h-12 items-center justify-center rounded-input bg-primary font-semibold text-primary-foreground"
        >
          {t("requestNew")}
        </Link>
      )}

      <Link href="/login" className="text-center text-sm font-semibold text-primary">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
