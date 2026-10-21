"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function InventoryActions() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        quantity: Number(data.get("quantity") || 0),
        unit: data.get("unit") || "piece",
      }),
    });
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "Could not save this ingredient.");
      setPending(false);
      return;
    }
    form.reset();
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-card bg-surface p-4">
      <h2 className="font-bold">Add ingredient to inventory</h2>
      <Input name="name" label="Ingredient" required maxLength={120} />
      <div className="grid grid-cols-2 gap-3">
        <Input name="quantity" label="Quantity" type="number" min="0" step="any" defaultValue="1" />
        <label className="flex flex-col gap-1 text-sm font-medium">
          Unit
          <select name="unit" className="h-12 rounded-input border border-border bg-background px-3">
            <option value="piece">piece</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option><option value="l">l</option>
          </select>
        </label>
      </div>
      <Button type="submit" fullWidth disabled={pending}>{pending ? "Saving..." : "Save to inventory"}</Button>
      {error && <p role="alert" className="text-sm text-warning">{error}</p>}
    </form>
  );
}
