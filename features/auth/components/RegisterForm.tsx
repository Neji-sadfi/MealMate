"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { registerAction } from "../services/actions";

export function RegisterForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(registerAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <Input
        name="name"
        autoComplete="name"
        required
        label={t("fields.name")}
        aria-invalid={state.fieldErrors?.name}
      />
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
        autoComplete="new-password"
        required
        minLength={8}
        label={t("fields.password")}
        showLabel={t("fields.showPassword")}
        hideLabel={t("fields.hidePassword")}
        aria-invalid={state.fieldErrors?.password}
      />

      {state.error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {t(`errors.${state.error}`)}
        </p>
      )}

      <Button type="submit" fullWidth disabled={pending}>
        {t("register.submit")}
      </Button>
    </form>
  );
}
