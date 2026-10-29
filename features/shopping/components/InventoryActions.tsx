"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CalendarClock, Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Unit } from "@/models/enums";

export type InventoryItemView = {
  id: string;
  name: string;
  aisle: string;
  quantity: number;
  unit: Unit;
  expiresAt?: string;
};

const units: Unit[] = ["piece", "g", "kg", "ml", "l", "tbsp", "tsp", "bunch", "pot", "to_taste"];

function expiryStatus(expiresAt?: string): "expired" | "today" | "soon" | "date" | "none" {
  if (!expiresAt) return "none";
  const expiry = new Date(`${expiresAt.slice(0, 10)}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysUntilExpiry < 0) return "expired";
  if (daysUntilExpiry === 0) return "today";
  if (daysUntilExpiry <= 3) return "soon";
  return "date";
}

export function InventoryActions({ initialItems }: { initialItems: InventoryItemView[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("pages.inventory");
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const expiry = data.get("expiresAt");
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          quantity: Number(data.get("quantity") || 1),
          unit: data.get("unit") || "piece",
          ...(expiry ? { expiresAt: `${expiry}T00:00:00.000Z` } : {}),
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("actions.error"));
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError(t("actions.error"));
    } finally {
      setPending(false);
    }
  }

  async function adjust(item: InventoryItemView, amount: number) {
    const quantity = Math.max(0, item.quantity + amount);
    setError("");
    const response = await fetch("/api/inventory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, quantity }),
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("actions.error"));
      return;
    }
    setItems((current) =>
      current.map((entry) => (entry.id === item.id ? { ...entry, quantity } : entry)),
    );
    router.refresh();
  }

  async function remove(item: InventoryItemView) {
    setError("");
    const response = await fetch("/api/inventory", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id }),
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("actions.error"));
      return;
    }
    setItems((current) => current.filter((entry) => entry.id !== item.id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="border border-border/70 p-4 shadow-sm sm:p-5">
        <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{t("add.title")}</h2>
          <Input name="name" label={t("add.ingredient")} required maxLength={120} />
          <Input
            name="quantity"
            label={t("add.quantity")}
            type="number"
            min="0"
            step="any"
            defaultValue="1"
            required
          />
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("add.unit")}
            <select
              name="unit"
              className="h-12 rounded-input border border-border bg-background px-3"
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {t(`units.${unit}`)}
                </option>
              ))}
            </select>
          </label>
          <Input name="expiresAt" label={t("add.expiresAt")} type="date" />
          <Button type="submit" fullWidth disabled={pending} className="sm:col-span-2">
            {pending ? t("add.saving") : t("add.submit")}
          </Button>
        </form>
      </Card>

      {items.length === 0 ? (
        <Card className="border border-border/70 bg-gradient-to-br from-tint/80 to-surface p-5">
          <h2 className="font-bold">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => {
            const status = expiryStatus(item.expiresAt);
            const tone =
              status === "expired" || status === "today"
                ? "bg-warning-bg text-danger"
                : status === "soon"
                  ? "bg-tint text-primary"
                  : "bg-surface text-muted";
            return (
              <li key={item.id}>
                <Card className="flex h-full flex-col gap-3 border border-border/70 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        {t(`aisles.${item.aisle as "other"}`)}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-tint px-2.5 py-1 text-sm font-bold text-primary">
                      {item.quantity} {t(`units.${item.unit}`)}
                    </span>
                  </div>
                  <p
                    className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${tone}`}
                  >
                    <CalendarClock aria-hidden className="size-4 shrink-0" />
                    {status === "date" && item.expiresAt
                      ? t("expires.date", {
                          date: new Intl.DateTimeFormat(locale === "fr" ? "fr-FR" : "en-US", {
                            dateStyle: "medium",
                          }).format(new Date(`${item.expiresAt.slice(0, 10)}T00:00:00.000Z`)),
                        })
                      : t(`expires.${status}`)}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label={`${t("actions.decrease")} ${item.name}`}
                        onClick={() => void adjust(item, -1)}
                        className="flex size-9 items-center justify-center rounded-full bg-background text-primary hover:bg-tint"
                      >
                        <Minus aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t("actions.increase")} ${item.name}`}
                        onClick={() => void adjust(item, 1)}
                        className="flex size-9 items-center justify-center rounded-full bg-background text-primary hover:bg-tint"
                      >
                        <Plus aria-hidden className="size-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`${t("actions.remove")} ${item.name}`}
                      onClick={() => void remove(item)}
                      className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-warning-bg hover:text-danger"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
