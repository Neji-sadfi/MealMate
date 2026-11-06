"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { DIETS } from "@/models/enums";
import { registerAction } from "../services/actions";

export function RegisterForm() {
  const t = useTranslations("auth");
  const tDiet = useTranslations("pages.profile.enums.diet");
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
      <section className="flex flex-col gap-3 border-t border-border pt-4">
        <h2 className="font-semibold">{t("register.profileTitle")}</h2>
        <div className="grid grid-cols-2 gap-3">
          <Input
            name="heightCm"
            type="number"
            min="50"
            max="260"
            step="any"
            required
            label={t("fields.heightCm")}
            aria-invalid={state.fieldErrors?.heightCm}
          />
          <Input
            name="weightKg"
            type="number"
            min="20"
            max="400"
            step="any"
            required
            label={t("fields.weightKg")}
            aria-invalid={state.fieldErrors?.weightKg}
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t("fields.diet")}
          <select
            name="diet"
            required
            aria-invalid={state.fieldErrors?.diet}
            className="h-12 w-full rounded-input border border-border bg-surface px-4 text-foreground"
            defaultValue=""
          >
            <option value="" disabled>
              {t("register.dietPlaceholder")}
            </option>
            {DIETS.map((diet) => (
              <option key={diet} value={diet}>
                {tDiet(diet)}
              </option>
            ))}
          </select>
        </label>
        <Input
          name="allergies"
          required
          maxLength={500}
          label={t("fields.allergies")}
          placeholder={t("register.allergiesPlaceholder")}
          aria-invalid={state.fieldErrors?.allergies}
        />
        <p className="-mt-2 text-xs text-muted">{t("register.allergiesHelp")}</p>
        <Input
          name="weeklyBudget"
          type="number"
          min="0"
          max="100000"
          step="any"
          required
          label={t("fields.weeklyBudget")}
          aria-invalid={state.fieldErrors?.weeklyBudget}
        />
      </section>

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
