"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Chip } from "@/components/ui/Chip";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CRITERIA_LIMITS, type PlanCriteria } from "../types";
import { addDays, toISODate, parseISODate } from "../services/week";
import { formatDayMonth, formatPantryList } from "../services/format";

type GenerateCriteriaCardProps = {
  weekStart: string;
  /** Criteria of the week being planned. */
  criteria: PlanCriteria;
  pantry: string[];
  /** Called on every change, so the screen can send them with the generation. */
  onCriteriaChange: (criteria: PlanCriteria) => void;
  onGenerate: () => void;
  /** True while the generate request is in flight. */
  disabled?: boolean;
  /** Changes when another week is opened: it remounts the inputs. */
  resetKey?: string;
};

export function GenerateCriteriaCard({
  weekStart,
  criteria,
  pantry,
  onCriteriaChange,
  onGenerate,
  disabled = false,
  resetKey = weekStart,
}: GenerateCriteriaCardProps) {
  const t = useTranslations("pages.mealPlan.criteria");
  const locale = useLocale();
  const from = formatDayMonth(weekStart, locale);
  const toDate = addDays(parseISODate(weekStart), criteria.days - 1);
  const to = formatDayMonth(toISODate(toDate), locale);
  const mealsCount = criteria.days * criteria.mealsPerDay;

  const dayOptions = Array.from(
    { length: CRITERIA_LIMITS.days.max - CRITERIA_LIMITS.days.min + 1 },
    (_, index) => CRITERIA_LIMITS.days.min + index,
  ).map((value) => ({ value: String(value), label: String(value) }));

  const mealsPerDayOptions = Array.from(
    { length: CRITERIA_LIMITS.mealsPerDay.max - CRITERIA_LIMITS.mealsPerDay.min + 1 },
    (_, index) => CRITERIA_LIMITS.mealsPerDay.min + index,
  ).map((value) => ({ value: String(value), label: String(value) }));

  const peopleOptions = Array.from(
    { length: CRITERIA_LIMITS.people.max - CRITERIA_LIMITS.people.min + 1 },
    (_, index) => CRITERIA_LIMITS.people.min + index,
  ).map((value) => ({ value: String(value), label: String(value) }));

  return (
    <Card tone="tint" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-extrabold">{t("title", { days: criteria.days })}</h2>
        <p className="text-sm text-muted">
          {t("summary", {
            from,
            to,
            people: t("people", { count: criteria.people }),
            pantry: formatPantryList(pantry, locale),
          })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select
          label={t("daysLabel")}
          value={String(criteria.days)}
          onChange={(event) =>
            onCriteriaChange({ ...criteria, days: Number(event.target.value) })
          }
          options={dayOptions}
        />
        <Select
          label={t("mealsPerDayLabel")}
          value={String(criteria.mealsPerDay)}
          onChange={(event) =>
            onCriteriaChange({ ...criteria, mealsPerDay: Number(event.target.value) })
          }
          options={mealsPerDayOptions}
        />
        <Select
          label={t("peopleLabel")}
          value={String(criteria.people)}
          onChange={(event) =>
            onCriteriaChange({ ...criteria, people: Number(event.target.value) })
          }
          options={peopleOptions}
        />
        <Input
          key={`extra-budget-${resetKey}`}
          label={t("extraBudgetLabel")}
          type="number"
          min={CRITERIA_LIMITS.extraBudget.min}
          max={CRITERIA_LIMITS.extraBudget.max}
          step={5}
          defaultValue={criteria.extraBudget}
          onChange={(event) => {
            const value = Number(event.target.value);
            // An empty field is not a number: keep the last valid value.
            if (!Number.isFinite(value)) return;
            onCriteriaChange({ ...criteria, extraBudget: value });
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Chip className="pointer-events-none">{t("extraBudget", { amount: criteria.extraBudget })}</Chip>
        <Chip className="pointer-events-none">{t("mealsCount", { count: mealsCount })}</Chip>
      </div>
      <Button fullWidth onClick={onGenerate} disabled={disabled}>
        {t("generate")}
      </Button>
    </Card>
  );
}
