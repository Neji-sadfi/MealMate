"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function BudgetActions({ currentLimit }: { currentLimit: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        limit: Number(data.get("limit")),
        expense: data.get("label")
          ? { label: data.get("label"), category: data.get("category"), amount: Number(data.get("amount")) }
          : undefined,
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not save the budget.");
      setPending(false);
      return;
    }
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <h2 className="font-bold">Update weekly budget</h2>
      <Input name="limit" label="Weekly limit" type="number" min="0" step="any" defaultValue={currentLimit} required />
      <Input name="label" label="Expense name" maxLength={120} />
      <div className="grid grid-cols-2 gap-3">
        <Input name="amount" label="Expense amount" type="number" min="0" step="any" defaultValue="0" />
        <label className="flex flex-col gap-1 text-sm font-medium">Category<select name="category" className="h-12 rounded-input border border-border bg-background px-3"><option value="grocery">Groceries</option><option value="fresh_products">Fresh products</option><option value="eating_out">Eating out</option><option value="other">Other</option></select></label>
      </div>
      <Button type="submit" fullWidth disabled={pending}>{pending ? "Saving..." : "Save budget"}</Button>
      {error && <p role="alert" className="text-sm text-warning">{error}</p>}
    </form>
  );
}
