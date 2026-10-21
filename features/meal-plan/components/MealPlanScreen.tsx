"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Copy, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { WeekStrip } from "@/components/ui/WeekStrip";
import {
  MAIN_MEAL_TYPES,
  timeForType,
  type GeneratorWarning,
  type MealPlanView,
  type MealType,
  type PlanCriteria,
  type PlannedMeal,
  type RecipeSnapshot,
} from "../types";
import type { MealPlanAction } from "../schemas";
import {
  OfflineError,
  countPendingActions,
  deleteWeekPlan,
  fetchWeekPlan,
  flushPendingActions,
  generateWeekPlan,
  sendMealPlanAction,
} from "../services/meal-plan-client";
import { formatDayHeading } from "../services/format";
import {
  addDays,
  parseISODate,
  startOfWeekMonday,
  toISODate,
  weekDates,
  weekdayOf,
} from "../services/week";
import { PlanTabs } from "./PlanTabs";
import { WeekNavigator } from "./WeekNavigator";
import { GenerateCriteriaCard } from "./GenerateCriteriaCard";
import { MealCard } from "./MealCard";
import {
  AddMealDialog,
  ConfirmDialog,
  DuplicateDayDialog,
  EditMealDialog,
  MoveMealDialog,
  RemoveMealDialog,
} from "./MealDialogs";

type DialogState =
  | { kind: "edit"; mealId: string; recipeId: string; type: MealType }
  | { kind: "add"; recipeId: string; type: MealType }
  | { kind: "move"; mealId: string; date: string; type: MealType }
  | { kind: "remove"; mealId: string }
  | { kind: "duplicateDay"; sourceDate: string; targetDate: string }
  | { kind: "deleteWeek" };

type MealPlanScreenProps = {
  todayISO: string;
  /** Current week, already loaded on the server: doubles as initial state. */
  initialPlan: MealPlanView;
  /** Seeded recipes, read server-side (no model import in client code). */
  recipes: RecipeSnapshot[];
  pantryNames: string[];
  shoppingCount: number;
};

function mealsOnDate(plan: MealPlanView, date: string): PlannedMeal[] {
  return plan.meals.filter((meal) => meal.date === date);
}

/** The criteria saved on the plan, used until the user changes them. */
function criteriaOf(plan: MealPlanView): PlanCriteria {
  return {
    days: plan.days,
    mealsPerDay: plan.mealsPerDay,
    extraBudget: plan.extraBudget,
    people: plan.people,
  };
}

export function MealPlanScreen({
  todayISO,
  initialPlan,
  recipes,
  pantryNames,
  shoppingCount,
}: MealPlanScreenProps) {
  const t = useTranslations("pages.mealPlan");
  const locale = useLocale();
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeekMonday(parseISODate(todayISO)));
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const [plansByWeek, setPlansByWeek] = useState<Record<string, MealPlanView>>(() => ({
    [initialPlan.weekStart]: initialPlan,
  }));
  const [failedWeeks, setFailedWeeks] = useState<string[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const [actionFailed, setActionFailed] = useState(false);
  const [warnings, setWarnings] = useState<GeneratorWarning[]>([]);
  const [generating, setGenerating] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  /** Criteria the user changed, kept per plan so they survive a re-render. */
  const [criteriaByPlan, setCriteriaByPlan] = useState<Record<string, PlanCriteria>>({});
  /** True when the plan on screen comes from the offline cache. */
  const [offlinePlan, setOfflinePlan] = useState(false);
  /** Changes made offline, waiting to be sent to the server. */
  const [pendingCount, setPendingCount] = useState(0);

  const weekKey = toISODate(weekStart);
  const plan = plansByWeek[weekKey] ?? null;

  // Async loading only: every setState lives inside a promise callback,
  // never synchronously in the effect body.
  useEffect(() => {
    if (plansByWeek[weekKey]) return;
    let cancelled = false;
    fetchWeekPlan(weekKey)
      .then((result) => {
        if (cancelled) return;
        setPlansByWeek((prev) => ({ ...prev, [result.plan.weekStart]: result.plan }));
        setFailedWeeks((prev) => prev.filter((key) => key !== weekKey));
        setOfflinePlan(result.fromCache);
      })
      .catch(() => {
        if (cancelled) return;
        setFailedWeeks((prev) => (prev.includes(weekKey) ? prev : [...prev, weekKey]));
      });
    return () => {
      cancelled = true;
    };
  }, [weekKey, plansByWeek, reloadToken]);

  // Offline sync: the changes made without a connection are sent as soon as
  // the device is online again, then the week is read once more.
  useEffect(() => {
    let cancelled = false;

    const sync = () => {
      void flushPendingActions()
        .then(async (flushed) => ({ flushed, queued: await countPendingActions() }))
        .then(({ flushed, queued }) => {
          if (cancelled) return;
          setPendingCount(queued);
          if (flushed === 0) return;
          return fetchWeekPlan(weekKey)
            .then((result) => {
              if (cancelled) return;
              setPlansByWeek((prev) => ({ ...prev, [result.plan.weekStart]: result.plan }));
              setOfflinePlan(result.fromCache);
            })
            .catch(() => {
              // Still offline: what is on screen stays as it is.
            });
        })
        .catch(() => {
          // The offline database is not available: nothing to synchronise.
        });
    };

    sync();
    window.addEventListener("online", sync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", sync);
    };
  }, [weekKey]);

  const stripDays = useMemo(
    () =>
      plan
        ? weekDates(weekStart).map((date) => {
            const weekday = weekdayOf(date);
            return {
              date,
              label: t(`weekdays.${weekday}`),
              fullLabel: t(`weekdayLabels.${weekday}`),
              hasContent: mealsOnDate(plan, date).length > 0,
            };
          })
        : [],
    [weekStart, plan, t],
  );

  function goWeek(delta: number) {
    const nextMonday = addDays(weekStart, delta * 7);
    const dates = weekDates(nextMonday);
    const todayIso = toISODate(new Date());
    setWeekStart(nextMonday);
    setSelectedDate(dates.includes(todayIso) ? todayIso : dates[0]!);
  }

  if (!plan && !failedWeeks.includes(weekKey)) {
    return <div className="h-40 animate-pulse rounded-card bg-tint" />;
  }

  if (!plan) {
    return (
      <div className="flex flex-col gap-3">
        <Card tone="warning">
          <p className="text-sm">{t("loadError")}</p>
        </Card>
        <Button variant="secondary" fullWidth onClick={() => setReloadToken((token) => token + 1)}>
          {t("retry")}
        </Button>
      </div>
    );
  }

  const monday = weekStart;
  const planCriteria = criteriaByPlan[plan.id] ?? criteriaOf(plan);

  const dayMeals = mealsOnDate(plan, selectedDate)
    .filter((meal) => meal.type !== "snack")
    .sort(
      (a, b) =>
        MAIN_MEAL_TYPES.indexOf(a.type as (typeof MAIN_MEAL_TYPES)[number]) -
        MAIN_MEAL_TYPES.indexOf(b.type as (typeof MAIN_MEAL_TYPES)[number]),
    );
  const snacks = mealsOnDate(plan, selectedDate).filter((meal) => meal.type === "snack");
  const snackKcal = snacks.reduce((sum, meal) => sum + meal.recipe.calories * meal.servings, 0);
  const snackProtein = snacks.reduce((sum, meal) => sum + meal.recipe.protein * meal.servings, 0);
  const totalKcal =
    dayMeals.reduce((sum, meal) => sum + meal.recipe.calories * meal.servings, 0) + snackKcal;
  const totalProtein =
    dayMeals.reduce((sum, meal) => sum + meal.recipe.protein * meal.servings, 0) + snackProtein;
  const dayOptions = weekDates(monday).map((date) => ({
    value: date,
    label: formatDayHeading(date, locale),
  }));
  // A day can only be copied to another day of the same week.
  const duplicateSource = dialog?.kind === "duplicateDay" ? dialog.sourceDate : undefined;
  const duplicateTargets = dayOptions.filter((option) => option.value !== duplicateSource);

  /** Sends one action to the API and stores the updated plan it returns. */
  function runAction(action: MealPlanAction, onDone?: (updated: MealPlanView) => void) {
    void sendMealPlanAction(plan.id, action)
      .then((updated) => {
        setPlansByWeek((prev) => ({ ...prev, [updated.weekStart]: updated }));
        setFailedWeeks((prev) => prev.filter((key) => key !== updated.weekStart));
        setActionFailed(false);
        onDone?.(updated);
      })
      .catch((error: unknown) => {
        if (error instanceof OfflineError) {
          setPendingCount((count) => count + 1);
          return;
        }
        setActionFailed(true);
      });
  }

  function updateCriteria(next: PlanCriteria) {
    setCriteriaByPlan((prev) => ({ ...prev, [plan.id]: next }));
  }

  /** POST /api/meal-plans/generate: replaces the week and collects warnings. */
  function handleGenerate() {
    if (generating) return;
    setGenerating(true);
    void generateWeekPlan({
      weekStart: plan.weekStart,
      days: planCriteria.days,
      mealsPerDay: planCriteria.mealsPerDay,
      extraBudget: planCriteria.extraBudget,
      people: planCriteria.people,
    })
      .then((result) => {
        setPlansByWeek((prev) => ({ ...prev, [result.plan.weekStart]: result.plan }));
        setWarnings(result.warnings);
        setActionFailed(false);
        setOfflinePlan(false);
      })
      .catch((error: unknown) => {
        if (error instanceof OfflineError) {
          setPendingCount((count) => count + 1);
          return;
        }
        setActionFailed(true);
      })
      .finally(() => setGenerating(false));
  }

  function warningText(warning: GeneratorWarning): string {
    switch (warning.code) {
      case "noValidRecipes":
        return t("warnings.noValidRecipes");
      case "overBudget":
        return t("warnings.overBudget", { cost: warning.cost, budget: warning.budget });
      case "kcalTarget":
        return t("warnings.kcalTarget", { kcal: warning.kcal, target: warning.target });
      case "reused":
        return t("warnings.reused");
    }
  }

  function openDuplicateDay() {
    const days = weekDates(monday);
    const index = days.indexOf(selectedDate);
    const fallback = days[index + 1] ?? days[index - 1] ?? selectedDate;
    setDialog({ kind: "duplicateDay", sourceDate: selectedDate, targetDate: fallback });
  }

  function duplicateWeek() {
    const nextMonday = addDays(monday, 7);
    runAction({ action: "duplicateWeek" }, () => {
      setWeekStart(nextMonday);
      setSelectedDate(toISODate(nextMonday));
    });
  }

  function deleteWeek() {
    void deleteWeekPlan(plan.id)
      .then(() => {
        setDialog(null);
        // The week is gone: the server creates an empty one when it is read again.
        setPlansByWeek((prev) => {
          const next = { ...prev };
          delete next[plan.weekStart];
          return next;
        });
      })
      .catch((error: unknown) => {
        setDialog(null);
        if (error instanceof OfflineError) {
          setPendingCount((count) => count + 1);
          return;
        }
        setActionFailed(true);
      });
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{t("kicker")}</p>
        <h1 className="text-2xl leading-tight font-extrabold">{t("subtitle")}</h1>
      </section>

      <PlanTabs />
      <WeekNavigator
        weekStart={plan.weekStart}
        weekEnd={plan.weekEnd}
        onPrevious={() => goWeek(-1)}
        onNext={() => goWeek(1)}
      />
      <WeekStrip
        days={stripDays}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
        label={t("weekStrip")}
      />

      {(offlinePlan || pendingCount > 0) && (
        <Card tone="warning" className="flex flex-col gap-1">
          {offlinePlan && <p className="text-sm">{t("offline.cached")}</p>}
          {pendingCount > 0 && <p className="text-sm">{t("offline.pending", { count: pendingCount })}</p>}
        </Card>
      )}

      {plan.meals.length === 0 && (
        <p className="rounded-card bg-tint px-4 py-3 text-sm text-muted">{t("emptyWeek")}</p>
      )}

      <GenerateCriteriaCard
        weekStart={plan.weekStart}
        criteria={planCriteria}
        pantry={pantryNames}
        onCriteriaChange={updateCriteria}
        onGenerate={handleGenerate}
        disabled={generating}
        resetKey={plan.id}
      />

      {warnings.length > 0 && (
        <Card tone="warning" className="flex flex-col gap-1">
          {warnings.map((warning, index) => (
            <p key={index} className="text-xs">
              {warningText(warning)}
            </p>
          ))}
        </Card>
      )}

      {actionFailed && (
        <Card tone="warning">
          <p className="text-sm">{t("actionError")}</p>
        </Card>
      )}

      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold capitalize">
          {formatDayHeading(selectedDate, locale)}
        </h2>
        <button
          type="button"
          onClick={openDuplicateDay}
          className="shrink-0 text-sm font-semibold text-primary"
        >
          + {t("duplicateDay")}
        </button>
      </div>

      {dayMeals.length === 0 ? (
        <p className="text-sm text-muted">{t("emptyDay")}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {dayMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onEdit={() =>
                setDialog({
                  kind: "edit",
                  mealId: meal.id,
                  recipeId: meal.recipe.id,
                  type: meal.type,
                })
              }
              onMove={() =>
                setDialog({ kind: "move", mealId: meal.id, date: meal.date, type: meal.type })
              }
              onRemove={() => setDialog({ kind: "remove", mealId: meal.id })}
            />
          ))}
        </div>
      )}

      {(dayMeals.length > 0 || snacks.length > 0) && (
        <p className="text-sm text-muted">
          {t("snacksLine", {
            kcal: snackKcal,
            protein: snackProtein,
            totalKcal,
            totalProtein,
          })}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          className="flex-1 rounded-full border border-primary"
          icon={Plus}
          onClick={() =>
            setDialog({
              kind: "add",
              recipeId: recipes[0]?.id ?? "",
              type: "breakfast",
            })
          }
        >
          {t("addMeal")}
        </Button>
        <Button
          variant="ghost"
          className="flex-1 rounded-full border border-primary"
          icon={Copy}
          onClick={duplicateWeek}
        >
          {t("duplicateWeek")}
        </Button>
      </div>

      <button
        type="button"
        onClick={() => setDialog({ kind: "deleteWeek" })}
        className="self-center text-sm font-semibold text-danger"
      >
        {t("deleteWeek")}
      </button>

      <Link
        href="/shopping"
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-5 text-center font-semibold text-primary-foreground"
      >
        {t("shoppingCta", { count: shoppingCount })}
      </Link>

      {dialog?.kind === "edit" && (
        <EditMealDialog
          recipes={recipes}
          recipeId={dialog.recipeId}
          type={dialog.type}
          onRecipeId={(recipeId) => setDialog({ ...dialog, recipeId })}
          onType={(type) => setDialog({ ...dialog, type })}
          onCancel={() => setDialog(null)}
          onSave={() => {
            const recipe = recipes.find((item) => item.id === dialog.recipeId);
            const meal = plan.meals.find((item) => item.id === dialog.mealId);
            if (recipe && meal) {
              runAction({
                action: "updateMeal",
                mealId: meal.id,
                recipeId: recipe.id,
                type: dialog.type,
                time: timeForType(dialog.type),
                servings: meal.servings,
              });
            }
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "add" && (
        <AddMealDialog
          recipes={recipes}
          recipeId={dialog.recipeId}
          type={dialog.type}
          onRecipeId={(recipeId) => setDialog({ ...dialog, recipeId })}
          onType={(type) => setDialog({ ...dialog, type })}
          onCancel={() => setDialog(null)}
          onSave={() => {
            const recipe = recipes.find((item) => item.id === dialog.recipeId);
            if (!recipe) return;
            runAction({
              action: "addMeal",
              date: selectedDate,
              type: dialog.type,
              recipeId: recipe.id,
              time: timeForType(dialog.type),
              servings: 1,
            });
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "move" && (
        <MoveMealDialog
          dates={dayOptions}
          date={dialog.date}
          type={dialog.type}
          onDate={(date) => setDialog({ ...dialog, date })}
          onType={(type) => setDialog({ ...dialog, type })}
          onCancel={() => setDialog(null)}
          onSave={() => {
            runAction({
              action: "moveMeal",
              mealId: dialog.mealId,
              date: dialog.date,
              type: dialog.type,
            });
            setSelectedDate(dialog.date);
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "remove" && (
        <RemoveMealDialog
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            runAction({ action: "removeMeal", mealId: dialog.mealId });
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "duplicateDay" && (
        <DuplicateDayDialog
          dates={duplicateTargets}
          targetDate={dialog.targetDate}
          targetHasMeals={mealsOnDate(plan, dialog.targetDate).length > 0}
          onTargetDate={(targetDate) => setDialog({ ...dialog, targetDate })}
          onCancel={() => setDialog(null)}
          onConfirm={() => {
            runAction({
              action: "duplicateDay",
              date: dialog.sourceDate,
              targetDate: dialog.targetDate,
            });
            setDialog(null);
          }}
        />
      )}

      {dialog?.kind === "deleteWeek" && (
        <ConfirmDialog
          title={t("dialog.deleteWeekTitle")}
          body={t("dialog.deleteWeekBody")}
          confirmLabel={t("dialog.deleteWeekConfirm")}
          onCancel={() => setDialog(null)}
          onConfirm={deleteWeek}
        />
      )}
    </div>
  );
}
