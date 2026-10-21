"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function WorkoutCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/workout-sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        focus: data.get("focus"),
        scheduledAt: data.get("scheduledAt"),
        durationMinutes: Number(data.get("durationMinutes")),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not save the workout.");
      setPending(false);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <details className="rounded-card bg-surface p-4">
      <summary className="cursor-pointer font-bold">Schedule a workout</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Input name="name" label="Workout name" required minLength={2} maxLength={120} />
        <Input name="focus" label="Focus" maxLength={200} />
        <Input name="scheduledAt" label="Date and time" type="datetime-local" required />
        <Input name="durationMinutes" label="Duration (minutes)" type="number" min="1" max="300" defaultValue="45" required />
        <Button type="submit" fullWidth disabled={pending}>{pending ? "Saving..." : "Save workout"}</Button>
        {error && <p role="alert" className="text-sm text-warning">{error}</p>}
      </form>
    </details>
  );
}
