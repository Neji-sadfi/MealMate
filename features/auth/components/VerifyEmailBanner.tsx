"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { MailWarning } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { resendVerificationAction } from "../services/actions";

/** Shown on the profile while the email address is not confirmed. */
export function VerifyEmailBanner({ email }: { email: string }) {
  const t = useTranslations("auth.verifyEmail.banner");
  const [state, formAction, pending] = useActionState(resendVerificationAction, {});

  return (
    <Card tone="warning" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <MailWarning aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="font-extrabold">{t("title")}</p>
          <p className="text-sm text-muted">{t("text", { email })}</p>
        </div>
      </div>
      {state.status ? (
        <p role="status" className="text-sm font-semibold">
          {t(`status.${state.status}`)}
        </p>
      ) : null}
      <form action={formAction}>
        <Button type="submit" variant="secondary" fullWidth disabled={pending}>
          {pending ? t("sending") : t("resend")}
        </Button>
      </form>
    </Card>
  );
}
