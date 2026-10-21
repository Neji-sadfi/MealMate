"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type ShoppingItem = { _id: string; name: string; quantity?: number; checked: boolean };

export function ShoppingActions({ items }: { items: ShoppingItem[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/shopping-lists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        quantity: Number(data.get("quantity") || 1),
        unit: data.get("unit") || "piece",
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not add the shopping item.");
      setPending(false);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  async function toggle(item: ShoppingItem) {
    setError("");
    const response = await fetch(`/api/shopping-items/${item._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checked: !item.checked }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not update the shopping item.");
      return;
    }
    router.refresh();
  }

  async function generate() {
    setGenerating(true);
    setError("");
    const response = await fetch("/api/shopping-lists/generate", { method: "POST" });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not generate the list.");
      setGenerating(false);
      return;
    }
    setGenerating(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Button type="button" variant="secondary" fullWidth disabled={generating} onClick={() => void generate()}>
        {generating ? "Generating..." : "Generate from this week's meals"}
      </Button>
      <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <h2 className="font-bold">Add an item</h2>
        <Input name="name" label="Item name" required maxLength={120} />
        <div className="grid grid-cols-2 gap-3">
          <Input name="quantity" label="Quantity" type="number" min="0" step="any" defaultValue="1" />
          <label className="flex flex-col gap-1 text-sm font-medium">
            Unit
            <select name="unit" className="h-12 rounded-input border border-border bg-background px-3">
              <option value="piece">piece</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option>
            </select>
          </label>
        </div>
        <Button type="submit" fullWidth disabled={pending}>{pending ? "Saving..." : "Add to list"}</Button>
      </form>
      {items.map((item) => (
        <button key={item._id} type="button" onClick={() => void toggle(item)} className="rounded-card text-left">
          <span className={`block rounded-card bg-surface p-4 ${item.checked ? "opacity-60 line-through" : ""}`}>
            <span className="block font-semibold">{item.name}</span>
            <span className="text-sm text-muted">{item.quantity ?? 1} · {item.checked ? "Bought" : "Tap to mark bought"}</span>
          </span>
        </button>
      ))}
      {error && <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">{error}</p>}
    </div>
  );
}
