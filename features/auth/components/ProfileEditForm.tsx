"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  ACTIVITY_LEVELS,
  DIETS,
  EQUIPMENT,
  NUTRITION_GOALS,
  SPORT_GOALS,
  SPORT_LEVELS,
  WEEKDAYS,
} from "@/models/enums";
import { updateProfileAction, type ProfileFormState } from "../services/actions";
import type { ProfileUser } from "./ProfileView";

const initialState: ProfileFormState = {};

/** Collapsible form to change the profile and the preferences chosen at sign-up. */
export function ProfileEditForm({ user }: { user: ProfileUser }) {
  const t = useTranslations("pages.profile");
  const [state, formAction, pending] = useActionState(updateProfileAction, initialState);
  const prefs = user.preferences;

  return (
    <details className="group rounded-card border border-border/70 bg-surface p-4 shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-bold text-primary marker:hidden">
        <Pencil aria-hidden className="size-4" />
        {t("edit.open")}
      </summary>
      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-2" noValidate>
        <Input
          name="name"
          label={t("edit.name")}
          defaultValue={user.name}
          autoComplete="name"
          required
          maxLength={80}
          aria-invalid={state.fieldErrors?.name}
        />
        <Input
          name="age"
          label={t("edit.age")}
          type="number"
          min="10"
          max="120"
          defaultValue={user.age}
          aria-invalid={state.fieldErrors?.age}
        />
        <Input
          name="heightCm"
          label={t("edit.heightCm")}
          type="number"
          min="50"
          max="260"
          step="any"
          defaultValue={user.heightCm}
          aria-invalid={state.fieldErrors?.heightCm}
        />
        <Input
          name="weightKg"
          label={t("edit.weightKg")}
          type="number"
          min="20"
          max="400"
          step="any"
          defaultValue={user.weightKg}
          aria-invalid={state.fieldErrors?.weightKg}
        />
        <Input
          name="occupation"
          label={t("edit.occupation")}
          defaultValue={user.occupation}
          maxLength={120}
        />
        <Input name="city" label={t("edit.city")} defaultValue={user.city} maxLength={120} />

        <h3 className="mt-2 font-bold sm:col-span-2">{t("sections.food")}</h3>
        <Select
          name="diet"
          label={t("fields.diet")}
          defaultValue={prefs.diet}
          options={DIETS.map((value) => ({ value, label: t(`enums.diet.${value}`) }))}
        />
        <Select
          name="goal"
          label={t("fields.goal")}
          defaultValue={prefs.goal}
          options={NUTRITION_GOALS.map((value) => ({ value, label: t(`enums.goal.${value}`) }))}
        />
        <Input
          name="allergies"
          label={t("fields.allergies")}
          defaultValue={prefs.allergies.join(", ")}
          placeholder={t("edit.listPlaceholder")}
          maxLength={500}
          aria-invalid={state.fieldErrors?.allergies}
        />
        <Input
          name="intolerances"
          label={t("fields.intolerances")}
          defaultValue={prefs.intolerances.join(", ")}
          placeholder={t("edit.listPlaceholder")}
          maxLength={500}
          aria-invalid={state.fieldErrors?.intolerances}
        />
        <Input
          name="weeklyBudget"
          label={t("edit.weeklyBudget", { currency: prefs.currency })}
          type="number"
          min="0"
          step="any"
          defaultValue={prefs.weeklyBudget}
          aria-invalid={state.fieldErrors?.weeklyBudget}
        />
        <div className="hidden sm:block" />
        <Input
          name="dailyCaloriesTarget"
          label={t("edit.caloriesTarget")}
          type="number"
          min="800"
          max="6000"
          defaultValue={prefs.dailyCaloriesTarget}
          aria-invalid={state.fieldErrors?.dailyCaloriesTarget}
        />
        <Input
          name="dailyProteinTarget"
          label={t("edit.proteinTarget")}
          type="number"
          min="10"
          max="400"
          defaultValue={prefs.dailyProteinTarget}
          aria-invalid={state.fieldErrors?.dailyProteinTarget}
        />
        <p className="-mt-1 text-xs text-muted sm:col-span-2">{t("edit.targetsHelp")}</p>

        <h3 className="mt-2 font-bold sm:col-span-2">{t("sections.sport")}</h3>
        <Select
          name="activityLevel"
          label={t("fields.activityLevel")}
          defaultValue={prefs.activityLevel}
          options={ACTIVITY_LEVELS.map((value) => ({
            value,
            label: t(`enums.activityLevel.${value}`),
          }))}
        />
        <Select
          name="sportGoal"
          label={t("fields.sportGoal")}
          defaultValue={prefs.sportGoal}
          options={SPORT_GOALS.map((value) => ({
            value,
            label: t(`enums.sportGoal.${value}`),
          }))}
        />
        <Select
          name="level"
          label={t("fields.level")}
          defaultValue={prefs.level}
          options={SPORT_LEVELS.map((value) => ({ value, label: t(`enums.level.${value}`) }))}
        />
        <Select
          name="equipment"
          label={t("fields.equipment")}
          defaultValue={prefs.equipment}
          options={EQUIPMENT.map((value) => ({ value, label: t(`enums.equipment.${value}`) }))}
        />
        <Input
          name="sessionDurationMinutes"
          label={t("edit.sessionDuration")}
          type="number"
          min="10"
          max="180"
          defaultValue={prefs.sessionDurationMinutes}
          aria-invalid={state.fieldErrors?.sessionDurationMinutes}
        />
        <fieldset className="flex flex-col gap-1.5 sm:col-span-2">
          <legend className="text-sm font-semibold">{t("fields.availableDays")}</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-tint px-3 text-sm font-semibold has-checked:bg-primary has-checked:text-primary-foreground"
              >
                <input
                  type="checkbox"
                  name="availableDays"
                  value={day}
                  defaultChecked={prefs.availableDays.includes(day)}
                  className="sr-only"
                />
                {t(`enums.weekday.${day}`)}
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && (
          <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm sm:col-span-2">
            {t(`edit.errors.${state.error}`)}
          </p>
        )}
        {state.saved && (
          <p
            role="status"
            className="rounded-input bg-success-bg px-4 py-3 text-sm text-success sm:col-span-2"
          >
            {t("edit.saved")}
          </p>
        )}
        <Button type="submit" fullWidth disabled={pending} className="sm:col-span-2">
          {pending ? t("edit.saving") : t("edit.save")}
        </Button>
      </form>
    </details>
  );
}
