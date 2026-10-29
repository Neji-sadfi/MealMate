import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/features/auth/components/LoginForm";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.login");
  return { title: t("submit") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations();
  const { reset, deleted } = await searchParams;

  return (
    <div className="mx-auto grid w-full max-w-5xl flex-1 content-center gap-7 py-6 lg:grid-cols-2 lg:items-center lg:gap-16">
      <section className="relative isolate overflow-hidden rounded-[1.75rem] bg-primary px-6 py-8 text-primary-foreground shadow-[0_24px_64px_-32px_rgba(40,94,67,0.65)] sm:px-9 sm:py-10 lg:py-14">
        <div
          aria-hidden
          className="absolute -top-24 -right-16 -z-10 size-64 rounded-full border-[28px] border-white/5"
        />
        <div
          aria-hidden
          className="absolute right-12 -bottom-32 -z-10 size-56 rounded-full bg-white/5 blur-2xl"
        />
        <p className="text-sm font-semibold text-white/70">{t("app.tagline")}</p>
        <h1 className="mt-5 max-w-lg text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">
          {t("auth.login.headline")}
        </h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
          {t("auth.login.intro")}
        </p>
      </section>

      <div className="mx-auto flex w-full max-w-md flex-col gap-5 lg:max-w-none">
        {reset === "1" && (
          <p role="status" className="rounded-input bg-success-bg px-4 py-3 text-sm text-success">
            {t("auth.resetPassword.done")}
          </p>
        )}
        {deleted === "1" && (
          <p role="status" className="rounded-input bg-success-bg px-4 py-3 text-sm text-success">
            {t("pages.profile.deleteAccount.done")}
          </p>
        )}

        <Card className="flex flex-col gap-5 border border-border/70 p-5 shadow-[0_20px_60px_-36px_rgba(28,43,35,0.3)] sm:p-7">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">MealMate</p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight">{t("auth.login.title")}</h2>
          </div>
          <LoginForm />
        </Card>

        <p className="text-center text-sm text-muted">
          {t("auth.login.newHere")}{" "}
          <Link href="/register" className="font-bold text-primary hover:underline">
            {t("auth.login.createAccount")}
          </Link>
        </p>

        <footer className="flex flex-col gap-1 text-center text-xs text-muted">
          <p className="font-semibold">{t("auth.login.privacy")}</p>
          <p>{t("auth.login.terms")}</p>
        </footer>
      </div>
    </div>
  );
}
