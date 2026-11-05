"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { LoaderCircle, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type PhaseDraft = { durationMinutes: string; description: string };
type ExerciseDraft = {
  name: string;
  sets: string;
  mode: "repetitions" | "durationSeconds";
  amount: string;
  restSeconds: string;
  tip: string;
};

type SessionData = {
  id: string;
  name: string;
  focus: string;
  scheduledAt: string;
  durationMinutes: number;
  warmUp: { durationMinutes: number; description: string } | null;
  exercises: Array<{
    name: string;
    sets: number;
    repetitions?: number;
    durationSeconds?: number;
    restSeconds: number;
    tip: string;
  }>;
  coolDown: { durationMinutes: number; description: string } | null;
};

function localDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function phaseDraft(phase: SessionData["warmUp"]): PhaseDraft {
  return {
    durationMinutes: phase ? String(phase.durationMinutes) : "",
    description: phase?.description ?? "",
  };
}

function exerciseDraft(exercise?: SessionData["exercises"][number]): ExerciseDraft {
  const timed = exercise?.durationSeconds !== undefined;
  return {
    name: exercise?.name ?? "",
    sets: String(exercise?.sets ?? 3),
    mode: timed ? "durationSeconds" : "repetitions",
    amount: String(timed ? exercise?.durationSeconds : (exercise?.repetitions ?? 10)),
    restSeconds: String(exercise?.restSeconds ?? 60),
    tip: exercise?.tip ?? "",
  };
}

export function WorkoutSessionActions({ session }: { session: SessionData }) {
  const t = useTranslations("pages.workoutSession.actions");
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(session.name);
  const [focus, setFocus] = useState(session.focus);
  const [scheduledAt, setScheduledAt] = useState(localDateTime(session.scheduledAt));
  const [durationMinutes, setDurationMinutes] = useState(String(session.durationMinutes));
  const [warmUp, setWarmUp] = useState(() => phaseDraft(session.warmUp));
  const [exercises, setExercises] = useState(() => session.exercises.map(exerciseDraft));
  const [coolDown, setCoolDown] = useState(() => phaseDraft(session.coolDown));

  function updateExercise(index: number, patch: Partial<ExerciseDraft>) {
    setExercises((current) =>
      current.map((exercise, currentIndex) =>
        currentIndex === index ? { ...exercise, ...patch } : exercise,
      ),
    );
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          focus,
          scheduledAt,
          durationMinutes: Number(durationMinutes),
          warmUp: warmUp.description.trim()
            ? {
                durationMinutes: Number(warmUp.durationMinutes),
                description: warmUp.description,
              }
            : null,
          exercises: exercises.map((exercise) => ({
            name: exercise.name,
            sets: Number(exercise.sets),
            [exercise.mode]: Number(exercise.amount),
            restSeconds: Number(exercise.restSeconds),
            tip: exercise.tip,
          })),
          coolDown: coolDown.description.trim()
            ? {
                durationMinutes: Number(coolDown.durationMinutes),
                description: coolDown.description,
              }
            : null,
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("updateError"));
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm", { name: session.name }))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/workout-sessions/${session.id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("deleteError"));
        return;
      }
      router.push("/sport");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          icon={Pencil}
          onClick={() => {
            setError("");
            setEditing((current) => !current);
          }}
        >
          {editing ? t("cancel") : t("edit")}
        </Button>
        <Button
          variant="ghost"
          disabled={pending}
          icon={pending && !editing ? LoaderCircle : Trash2}
          className="text-warning"
          onClick={() => void remove()}
        >
          {t("delete")}
        </Button>
      </div>

      {editing && (
        <form onSubmit={(event) => void save(event)} className="flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("name")}
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={120}
            />
            <Input
              label={t("focus")}
              value={focus}
              onChange={(event) => setFocus(event.target.value)}
              maxLength={200}
            />
            <Input
              label={t("scheduledAt")}
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              required
            />
            <Input
              label={t("durationMinutes")}
              type="number"
              min={1}
              max={300}
              value={durationMinutes}
              onChange={(event) => setDurationMinutes(event.target.value)}
              required
            />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t("warmUp")}</h2>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Input
                label={t("phaseMinutes")}
                type="number"
                min={0}
                max={30}
                value={warmUp.durationMinutes}
                onChange={(event) =>
                  setWarmUp((current) => ({ ...current, durationMinutes: event.target.value }))
                }
              />
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("description")}
                <textarea
                  value={warmUp.description}
                  onChange={(event) =>
                    setWarmUp((current) => ({ ...current, description: event.target.value }))
                  }
                  maxLength={500}
                  rows={2}
                  className="rounded-input border border-border bg-surface p-3 font-normal text-foreground"
                />
              </label>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{t("exercises")}</h2>
              <Button
                type="button"
                variant="secondary"
                icon={Plus}
                onClick={() => setExercises((current) => [...current, exerciseDraft()])}
              >
                {t("addExercise")}
              </Button>
            </div>
            {exercises.map((exercise, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-xl border border-border p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t("exerciseName")}
                    value={exercise.name}
                    onChange={(event) => updateExercise(index, { name: event.target.value })}
                    required
                    maxLength={120}
                  />
                  <Input
                    label={t("sets")}
                    type="number"
                    min={1}
                    max={100}
                    value={exercise.sets}
                    onChange={(event) => updateExercise(index, { sets: event.target.value })}
                    required
                  />
                  <label className="flex flex-col gap-1.5 text-sm font-semibold">
                    {t("measure")}
                    <select
                      value={exercise.mode}
                      onChange={(event) =>
                        updateExercise(index, {
                          mode: event.target.value as ExerciseDraft["mode"],
                          amount: event.target.value === "repetitions" ? "10" : "30",
                        })
                      }
                      className="h-12 w-full rounded-input border border-border bg-surface px-4 text-foreground"
                    >
                      <option value="repetitions">{t("repetitions")}</option>
                      <option value="durationSeconds">{t("durationSeconds")}</option>
                    </select>
                  </label>
                  <Input
                    label={
                      exercise.mode === "repetitions" ? t("repetitions") : t("durationSeconds")
                    }
                    type="number"
                    min={1}
                    max={exercise.mode === "repetitions" ? 1000 : 3600}
                    value={exercise.amount}
                    onChange={(event) => updateExercise(index, { amount: event.target.value })}
                    required
                  />
                  <Input
                    label={t("restSeconds")}
                    type="number"
                    min={0}
                    max={3600}
                    value={exercise.restSeconds}
                    onChange={(event) => updateExercise(index, { restSeconds: event.target.value })}
                    required
                  />
                  <Input
                    label={t("tip")}
                    value={exercise.tip}
                    onChange={(event) => updateExercise(index, { tip: event.target.value })}
                    maxLength={500}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-warning self-start"
                  onClick={() =>
                    setExercises((current) => current.filter((_, itemIndex) => itemIndex !== index))
                  }
                >
                  {t("removeExercise")}
                </Button>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t("coolDown")}</h2>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <Input
                label={t("phaseMinutes")}
                type="number"
                min={0}
                max={30}
                value={coolDown.durationMinutes}
                onChange={(event) =>
                  setCoolDown((current) => ({ ...current, durationMinutes: event.target.value }))
                }
              />
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("description")}
                <textarea
                  value={coolDown.description}
                  onChange={(event) =>
                    setCoolDown((current) => ({ ...current, description: event.target.value }))
                  }
                  maxLength={500}
                  rows={2}
                  className="rounded-input border border-border bg-surface p-3 font-normal text-foreground"
                />
              </label>
            </div>
          </section>

          {error && (
            <p role="alert" className="text-warning text-sm">
              {error}
            </p>
          )}
          <Button type="submit" disabled={pending} icon={pending ? LoaderCircle : Save}>
            {pending ? t("saving") : t("save")}
          </Button>
        </form>
      )}
      {!editing && error && (
        <p role="alert" className="text-warning text-sm">
          {error}
        </p>
      )}
    </Card>
  );
}
