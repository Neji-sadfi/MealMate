import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/features/auth/components/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("submit") };
}

export default function LoginPage() {
  const t = useTranslations();

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">{t("app.tagline")}</p>
        <h1 className="text-3xl leading-tight font-extrabold">{t("auth.login.headline")}</h1>
        <p className="text-muted">{t("auth.login.intro")}</p>
      </section>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-bold">{t("auth.login.title")}</h2>
        <LoginForm />
      </Card>

      <p className="text-center text-sm">
        {t("auth.login.newHere")}{" "}
        <Link href="/register" className="font-semibold text-primary">
          {t("auth.login.createAccount")}
        </Link>
      </p>

      <footer className="mt-auto flex flex-col gap-1 text-center text-xs text-muted">
        <p className="font-semibold">{t("auth.login.privacy")}</p>
        <p>{t("auth.login.terms")}</p>
      </footer>
    </div>
  );
}
