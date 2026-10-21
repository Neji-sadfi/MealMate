"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForumPostForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/forum/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: data.get("title"),
        content: data.get("content"),
        category: data.get("category"),
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not publish this post.");
      setPending(false);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <details className="rounded-card bg-surface p-4">
      <summary className="cursor-pointer font-bold">Start a discussion</summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Input name="title" label="Title" required minLength={3} maxLength={140} />
        <label className="flex flex-col gap-1 text-sm font-medium">Category<select name="category" className="h-12 rounded-input border border-border bg-background px-3"><option value="nutrition">Nutrition</option><option value="weight_loss">Weight loss</option><option value="muscle_gain">Muscle gain</option><option value="training">Training</option><option value="motivation">Motivation</option></select></label>
        <label className="flex flex-col gap-1 text-sm font-medium">Message<textarea name="content" rows={4} maxLength={5000} required className="rounded-input border border-border bg-background p-3" /></label>
        <Button type="submit" fullWidth disabled={pending}>{pending ? "Publishing..." : "Publish post"}</Button>
        {error && <p role="alert" className="text-sm text-warning">{error}</p>}
      </form>
    </details>
  );
}
