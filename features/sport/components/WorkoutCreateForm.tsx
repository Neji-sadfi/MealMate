"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function WorkoutCreateForm() {
  const router = useRouter();
  const t = useTranslations("pages.sport.create");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/workout-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          focus: data.get("focus"),
          // datetime-local has no timezone: convert here, where the local time is known.
          scheduledAt: new Date(String(data.get("scheduledAt"))).toISOString(),
          durationMinutes: Number(data.get("durationMinutes")),
        }),
      });
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded-card bg-surface p-4">
      <summary className="cursor-pointer font-bold">{t("title")}</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Input name="name" label={t("name")} required minLength={2} maxLength={120} />
        <Input name="focus" label={t("focus")} maxLength={200} />
        <Input name="scheduledAt" label={t("date")} type="datetime-local" required />
        <Input
          name="durationMinutes"
          label={t("duration")}
          type="number"
          min="1"
          max="300"
          defaultValue="45"
          required
        />
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? t("saving") : t("save")}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-warning">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
