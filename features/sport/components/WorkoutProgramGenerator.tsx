"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Dumbbell, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { Equipment, SportGoal, SportLevel, Weekday } from "@/models/enums";
import type { WorkoutProgram, WorkoutSettings } from "@/features/sport/schemas";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const GOALS: SportGoal[] = ["muscle_gain", "weight_loss", "endurance", "fitness", "maintenance"];
const LEVELS: SportLevel[] = ["beginner", "intermediate", "advanced"];
const EQUIPMENT: Equipment[] = ["none", "home", "gym"];

type Props = {
  initialSettings: WorkoutSettings;
};

export function WorkoutProgramGenerator({ initialSettings }: Props) {
  const t = useTranslations("pages.sport.generator");
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [program, setProgram] = useState<WorkoutProgram | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);

  function updateSettings(nextSettings: WorkoutSettings) {
    setSettings(nextSettings);
    setProgram(null);
    setSuccess(false);
  }

  function toggleDay(day: Weekday) {
    const days = settings.days.includes(day)
      ? settings.days.filter((selected) => selected !== day)
      : [...settings.days, day];
    updateSettings({ ...settings, days: WEEKDAYS.filter((weekday) => days.includes(weekday)) });
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGenerating(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetch("/api/sport-plans/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...settings, consent: true }),
      });
      const result = (await response.json().catch(() => null)) as
        (WorkoutProgram & { error?: never }) | { error?: string } | null;
      if (!response.ok || !result || !("sessions" in result)) {
        setError(
          response.status === 503
            ? t("errors.notConfigured")
            : response.status === 429 || response.status === 504
              ? t("errors.busy")
              : t("errors.generate"),
        );
        return;
      }
      setProgram(result);
    } catch {
      setError(t("errors.network"));
    } finally {
      setGenerating(false);
    }
  }

  async function saveProgram() {
    if (!program || !window.confirm(t("confirmReplace"))) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const response = await fetch("/api/sport-plans/save-generated", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(program),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.save"));
        return;
      }
      setSuccess(true);
      setProgram(null);
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4 border border-primary/10 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Sparkles aria-hidden className="size-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold">{t("title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("description")}</p>
        </div>
      </div>

      <form onSubmit={(event) => void generate(event)} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("goal")}
            <select
              value={settings.goal}
              onChange={(event) =>
                updateSettings({ ...settings, goal: event.target.value as SportGoal })
              }
              className="h-11 rounded-input border border-border bg-background px-3 font-medium"
            >
              {GOALS.map((goal) => (
                <option key={goal} value={goal}>
                  {t(`goals.${goal}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("level")}
            <select
              value={settings.level}
              onChange={(event) =>
                updateSettings({ ...settings, level: event.target.value as SportLevel })
              }
              className="h-11 rounded-input border border-border bg-background px-3 font-medium"
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {t(`levels.${level}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("duration")}
            <input
              type="number"
              min={10}
              max={180}
              value={settings.sessionDurationMinutes}
              onChange={(event) =>
                updateSettings({ ...settings, sessionDurationMinutes: Number(event.target.value) })
              }
              className="h-11 rounded-input border border-border bg-background px-3 font-medium"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t("equipment")}
            <select
              value={settings.equipment}
              onChange={(event) =>
                updateSettings({ ...settings, equipment: event.target.value as Equipment })
              }
              className="h-11 rounded-input border border-border bg-background px-3 font-medium"
            >
              {EQUIPMENT.map((equipment) => (
                <option key={equipment} value={equipment}>
                  {t(`equipmentOptions.${equipment}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{t("days")}</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {WEEKDAYS.map((day) => (
              <label
                key={day}
                className={`flex min-h-10 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-semibold transition-colors ${settings.days.includes(day) ? "border-primary bg-tint text-primary" : "border-border bg-background text-muted hover:border-primary/40"}`}
              >
                <input
                  type="checkbox"
                  checked={settings.days.includes(day)}
                  onChange={() => toggleDay(day)}
                  className="sr-only"
                />
                {t(`weekdays.${day}`)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={aiConsent}
            onChange={(event) => setAiConsent(event.target.checked)}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>{t("privacyNotice")}</span>
        </label>

        <Button
          type="submit"
          fullWidth
          disabled={generating || saving || settings.days.length === 0 || !aiConsent}
        >
          {generating ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Dumbbell aria-hidden className="size-4" />
          )}
          {generating ? t("generating") : t("generate")}
        </Button>
      </form>

      {error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {error}
        </p>
      )}
      {success && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-input bg-success-bg px-4 py-3 text-sm text-success"
        >
          <CheckCircle2 aria-hidden className="size-4" />
          {t("saved")}
        </p>
      )}

      {program && (
        <section
          aria-labelledby="workout-preview-title"
          className="flex flex-col gap-3 border-t border-border pt-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 id="workout-preview-title" className="text-lg font-bold">
                {t("previewTitle")}
              </h3>
              <p className="text-sm text-muted">{t("previewNote")}</p>
            </div>
            <Button type="button" disabled={saving} onClick={() => void saveProgram()}>
              {saving ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <CheckCircle2 aria-hidden className="size-4" />
              )}
              {saving ? t("saving") : t("save")}
            </Button>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            {program.sessions.map((session) => (
              <Card key={session.day} className="border border-border/70 bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold tracking-wide text-primary uppercase">
                      {t(`weekdays.${session.day}`)}
                    </p>
                    <h4 className="mt-1 text-lg font-bold">{session.name}</h4>
                    <p className="text-sm text-muted">{session.focus}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-tint px-3 py-1 text-xs font-semibold text-primary">
                    {program.settings.sessionDurationMinutes} {t("minutes")}
                  </span>
                </div>

                <div className="mt-4 rounded-xl bg-tint/60 p-3">
                  <p className="text-sm font-bold">
                    {t("warmUp")} · {session.warmUp.durationMinutes} {t("minutes")}
                  </p>
                  <p className="mt-1 text-sm text-muted">{session.warmUp.description}</p>
                </div>

                <ol className="mt-3 flex flex-col gap-2">
                  {session.exercises.map((exercise, index) => (
                    <li
                      key={`${exercise.name}-${index}`}
                      className="rounded-xl border border-border/60 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-semibold">
                          {index + 1}. {exercise.name}
                        </p>
                        <span className="shrink-0 text-right text-xs text-muted">
                          {exercise.sets} ×{" "}
                          {exercise.repetitions
                            ? exercise.repetitions
                            : `${exercise.durationSeconds}s`}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {t("rest")}: {exercise.restSeconds}s
                      </p>
                      <p className="mt-2 text-sm leading-relaxed">
                        <span className="font-semibold text-primary">{t("tip")}:</span>{" "}
                        {exercise.tip}
                      </p>
                    </li>
                  ))}
                </ol>

                <div className="mt-3 rounded-xl bg-surface p-3">
                  <p className="text-sm font-bold">
                    {t("coolDown")} · {session.coolDown.durationMinutes} {t("minutes")}
                  </p>
                  <p className="mt-1 text-sm text-muted">{session.coolDown.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}
    </Card>
  );
}
