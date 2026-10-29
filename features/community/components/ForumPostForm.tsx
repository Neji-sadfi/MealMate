"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function ForumPostForm() {
  const router = useRouter();
  const t = useTranslations("pages.community.actions");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
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
        setError(t("publishError"));
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="group rounded-[1.5rem] border border-border/70 bg-surface p-4 shadow-sm transition-shadow open:shadow-md sm:p-5">
      <summary className="cursor-pointer list-none font-bold marker:hidden">
        <span className="flex items-center justify-between gap-3">
          <span>
            <span className="block text-base">{t("startDiscussion")}</span>
            <span className="mt-1 block text-sm font-normal text-muted">{t("sharePrompt")}</span>
          </span>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-primary transition-transform group-open:rotate-45">
            +
          </span>
        </span>
      </summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
        <Input name="title" label={t("title")} required minLength={3} maxLength={140} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("category")}
          <select
            name="category"
            className="h-12 rounded-input border border-border bg-background px-3"
          >
            {(["nutrition", "weight_loss", "muscle_gain", "training", "motivation"] as const).map(
              (category) => (
                <option key={category} value={category}>
                  {t(`categories.${category}`)}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("message")}
          <textarea
            name="content"
            rows={4}
            maxLength={5000}
            required
            className="rounded-input border border-border bg-background p-3"
          />
        </label>
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? t("publishing") : t("publishPost")}
        </Button>
        {error && (
          <p role="alert" className="text-warning text-sm">
            {error}
          </p>
        )}
      </form>
    </details>
  );
}
