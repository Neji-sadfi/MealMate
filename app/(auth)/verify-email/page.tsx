import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { auth } from "@/lib/auth";
import { consumeAuthToken } from "@/features/auth/services/tokens";
import { User } from "@/models/User";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth.verifyEmail");
  return { title: t("title") };
}

export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const t = await getTranslations("auth.verifyEmail");
  const { token } = await searchParams;

  const userId = await consumeAuthToken(
    typeof token === "string" ? token : "",
    "email_verification",
  );
  if (userId) {
    // $min keeps the first verification date if the user was already verified.
    await User.updateOne({ _id: userId }, { $min: { emailVerifiedAt: new Date() } });
  }
  const signedIn = Boolean((await auth())?.user);
  const Icon = userId ? CircleCheck : CircleX;

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <Icon aria-hidden className={`size-14 ${userId ? "text-success" : "text-danger"}`} />
        <h1 className="text-2xl font-black">{userId ? t("successTitle") : t("errorTitle")}</h1>
        <p className="text-sm text-muted">{userId ? t("successText") : t("errorText")}</p>
      </Card>

      <Link
        href={signedIn ? "/profile" : "/login"}
        className="flex h-12 items-center justify-center rounded-input bg-primary font-semibold text-primary-foreground"
      >
        {signedIn ? t("toProfile") : t("toLogin")}
      </Link>
    </div>
  );
}
