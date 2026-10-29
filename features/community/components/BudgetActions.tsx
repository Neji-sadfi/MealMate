"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function BudgetActions({ currentLimit }: { currentLimit: number }) {
  const router = useRouter();
  const t = useTranslations("pages.tracking.budget");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const label = String(data.get("label") ?? "").trim();
    const amount = Number(data.get("amount") ?? 0);
    if (label && (!Number.isFinite(amount) || amount <= 0)) {
      setError(t("expenseAmountRequired"));
      setPending(false);
      return;
    }
    const response = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: Number(data.get("limit")),
        expense: label ? { label, category: data.get("category"), amount } : undefined,
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? t("error"));
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-3 rounded-card border border-border/70 bg-surface p-4 shadow-sm sm:grid-cols-2 sm:p-5"
    >
      <h2 className="font-bold sm:col-span-2">{t("update")}</h2>
      <Input
        name="limit"
        label={t("limitField")}
        type="number"
        min="0"
        step="any"
        defaultValue={currentLimit}
        required
      />
      <Input name="label" label={t("expenseName")} maxLength={120} />
      <Input name="amount" label={t("amount")} type="number" min="0" step="any" defaultValue="0" />
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("category")}
        <select
          name="category"
          className="h-12 rounded-input border border-border bg-background px-3"
        >
          <option value="grocery">{t("categories.grocery")}</option>
          <option value="fresh_products">{t("categories.fresh_products")}</option>
          <option value="eating_out">{t("categories.eating_out")}</option>
          <option value="other">{t("categories.other")}</option>
        </select>
      </label>
      <p className="text-xs text-muted sm:col-span-2">{t("expenseHint")}</p>
      <Button type="submit" fullWidth disabled={pending} className="sm:col-span-2">
        {pending ? t("saving") : t("save")}
      </Button>
      {error && (
        <p role="alert" className="text-warning text-sm sm:col-span-2">
          {error}
        </p>
      )}
    </form>
  );
}
