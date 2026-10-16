import type { Metadata } from "next";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.register");
  return { title: t("title") };
}

export default function RegisterPage() {
  const t = useTranslations("auth.register");

  return (
    <div className="flex flex-1 flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-extrabold">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </section>

      <Card>
        <RegisterForm />
      </Card>

      <p className="text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-semibold text-primary">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
