"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { loginAction } from "../services/actions";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Input
        name="email"
        type="email"
        autoComplete="email"
        required
        label={t("fields.email")}
        aria-invalid={state.fieldErrors?.email}
      />
      <PasswordInput
        name="password"
        autoComplete="current-password"
        required
        label={t("fields.password")}
        showLabel={t("fields.showPassword")}
        hideLabel={t("fields.hidePassword")}
        aria-invalid={state.fieldErrors?.password}
      />
      <Link href="/forgot-password" className="self-end text-sm font-semibold text-primary">
        {t("login.forgotPassword")}
      </Link>

      {state.error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {t("login.submit")}
      </Button>
    </form>
  );
}
