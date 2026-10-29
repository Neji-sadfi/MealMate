"use client";

import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { MAIN_MEAL_TYPES, type MealType, type RecipeSnapshot } from "../types";

type SheetProps = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

/** Local bottom sheet. Swap for a shared dialog when one lands in components/ui. */
function Sheet({ title, children, onClose }: SheetProps) {
  const t = useTranslations("pages.mealPlan.dialog");

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label={t("close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="meal-dialog-title"
        className="relative z-10 w-full max-w-md rounded-t-2xl bg-surface p-4 pb-8 shadow-lg"
      >
        <h2 id="meal-dialog-title" className="mb-4 text-lg font-extrabold">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

type RecipeFormProps = {
  recipes: RecipeSnapshot[];
  recipeId: string;
  type: MealType;
  onRecipeId: (id: string) => void;
  onType: (type: MealType) => void;
  onCancel: () => void;
  onSave: () => void;
  title: string;
  showType?: boolean;
};

function RecipeForm({
  recipes,
  recipeId,
  type,
  onRecipeId,
  onType,
  onCancel,
  onSave,
  title,
  showType = false,
}: RecipeFormProps) {
  const t = useTranslations("pages.mealPlan");

  return (
    <Sheet title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        {showType && (
          <Select
            label={t("dialog.pickType")}
            value={type}
            onChange={(event) => onType(event.target.value as MealType)}
            options={MAIN_MEAL_TYPES.map((value) => ({
              value,
              label: t(`types.${value}`),
            }))}
          />
        )}
        <Select
          label={t("dialog.pickRecipe")}
          value={recipeId}
          onChange={(event) => onRecipeId(event.target.value)}
          options={recipes.map((recipe) => ({ value: recipe.id, label: recipe.title }))}
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t("dialog.cancel")}
          </Button>
          <Button className="flex-1" onClick={onSave} disabled={!recipeId}>
            {t("dialog.save")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

export function EditMealDialog(props: Omit<RecipeFormProps, "showType" | "title">) {
  const t = useTranslations("pages.mealPlan.dialog");
  return <RecipeForm {...props} title={t("editTitle")} />;
}

export function AddMealDialog(props: Omit<RecipeFormProps, "showType" | "title">) {
  const t = useTranslations("pages.mealPlan.dialog");
  return <RecipeForm {...props} showType title={t("addTitle")} />;
}

type MoveMealDialogProps = {
  dates: { value: string; label: string }[];
  date: string;
  type: MealType;
  onDate: (date: string) => void;
  onType: (type: MealType) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function MoveMealDialog({
  dates,
  date,
  type,
  onDate,
  onType,
  onCancel,
  onSave,
}: MoveMealDialogProps) {
  const t = useTranslations("pages.mealPlan");

  return (
    <Sheet title={t("dialog.moveTitle")} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <Select
          label={t("dialog.pickDay")}
          value={date}
          onChange={(event) => onDate(event.target.value)}
          options={dates}
        />
        <Select
          label={t("dialog.pickType")}
          value={type}
          onChange={(event) => onType(event.target.value as MealType)}
          options={MAIN_MEAL_TYPES.map((value) => ({
            value,
            label: t(`types.${value}`),
          }))}
        />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t("dialog.cancel")}
          </Button>
          <Button className="flex-1" onClick={onSave}>
            {t("dialog.save")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

type DuplicateDayDialogProps = {
  /** Days of the week the day can be copied to. */
  dates: { value: string; label: string }[];
  targetDate: string;
  /** True when the target day already has meals: they will be replaced. */
  targetHasMeals: boolean;
  onTargetDate: (date: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DuplicateDayDialog({
  dates,
  targetDate,
  targetHasMeals,
  onTargetDate,
  onCancel,
  onConfirm,
}: DuplicateDayDialogProps) {
  const t = useTranslations("pages.mealPlan.dialog");

  return (
    <Sheet title={t("duplicateDayTitle")} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <Select
          label={t("pickTargetDay")}
          value={targetDate}
          onChange={(event) => onTargetDate(event.target.value)}
          options={dates}
        />
        {targetHasMeals && <p className="text-sm text-danger">{t("targetHasMeals")}</p>}
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button className="flex-1" onClick={onConfirm}>
            {t("duplicateDayConfirm")}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

type ConfirmDialogProps = {
  title: string;
  body: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const t = useTranslations("pages.mealPlan.dialog");

  return (
    <Sheet title={title} onClose={onCancel}>
      <p className="mb-4 text-sm text-muted">{body}</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

type RemoveMealDialogProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

export function RemoveMealDialog({ onCancel, onConfirm }: RemoveMealDialogProps) {
  const t = useTranslations("pages.mealPlan.dialog");

  return (
    <Sheet title={t("removeTitle")} onClose={onCancel}>
      <p className="mb-4 text-sm text-muted">{t("removeBody")}</p>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          {t("removeConfirm")}
        </Button>
      </div>
    </Sheet>
  );
}
