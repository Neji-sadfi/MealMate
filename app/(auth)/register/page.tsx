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
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 py-6">
      <section className="flex flex-col gap-2">
        <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">MealMate</p>
        <h1 className="text-3xl leading-tight font-extrabold tracking-tight">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </section>

      <Card className="border border-border/70 p-5 shadow-[0_20px_60px_-36px_rgba(28,43,35,0.3)] sm:p-7">
        <RegisterForm />
      </Card>

      <p className="text-center text-sm">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          {t("signIn")}
        </Link>
      </p>
    </div>
  );
}
