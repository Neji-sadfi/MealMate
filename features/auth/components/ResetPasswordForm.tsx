"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { resetPasswordAction } from "../services/actions";

export function ResetPasswordForm({ token }: { token: string }) {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(resetPasswordAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="token" value={token} />
      <PasswordInput
        name="password"
        autoComplete="new-password"
        required
        minLength={8}
        label={t("resetPassword.newPassword")}
        showLabel={t("fields.showPassword")}
        hideLabel={t("fields.hidePassword")}
        aria-invalid={state.fieldErrors?.password}
      />
      <p className="-mt-2 text-xs text-muted">{t("resetPassword.passwordHelp")}</p>
      <PasswordInput
        name="confirmPassword"
        autoComplete="new-password"
        required
        label={t("resetPassword.confirmPassword")}
        showLabel={t("fields.showPassword")}
        hideLabel={t("fields.hidePassword")}
        aria-invalid={state.fieldErrors?.confirmPassword}
      />

      {state.error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {t(`errors.${state.error}`)}
          {state.error === "invalidResetLink" && (
            <>
              {" "}
              <Link href="/forgot-password" className="font-semibold text-primary">
                {t("resetPassword.requestNew")}
              </Link>
            </>
          )}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {pending ? t("resetPassword.saving") : t("resetPassword.submit")}
      </Button>
    </form>
  );
}
