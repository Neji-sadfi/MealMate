"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { deleteAccountAction } from "../services/actions";

/** "Danger zone" at the bottom of the profile. Asks for the password before deleting. */
export function DeleteAccountSection() {
  const t = useTranslations("pages.profile.deleteAccount");
  const tAuth = useTranslations("auth.fields");
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccountAction, {});

  if (!open) {
    return (
      <Button
        variant="ghost"
        icon={Trash2}
        fullWidth
        onClick={() => setOpen(true)}
        className="text-danger"
      >
        {t("open")}
      </Button>
    );
  }

  return (
    <Card tone="warning" className="flex flex-col gap-3">
      <h2 className="font-extrabold text-danger">{t("title")}</h2>
      <p className="text-sm">{t("warning")}</p>
      <form action={formAction} className="flex flex-col gap-3">
        <PasswordInput
          name="password"
          autoComplete="current-password"
          required
          label={t("passwordLabel")}
          showLabel={tAuth("showPassword")}
          hideLabel={tAuth("hidePassword")}
          error={state.error ? t(`errors.${state.error}`) : undefined}
        />
        <Button
          type="submit"
          fullWidth
          disabled={pending}
          className="bg-danger text-white hover:bg-danger/90"
        >
          {pending ? t("deleting") : t("confirm")}
        </Button>
        <Button variant="secondary" fullWidth onClick={() => setOpen(false)} disabled={pending}>
          {t("cancel")}
        </Button>
      </form>
    </Card>
  );
}
