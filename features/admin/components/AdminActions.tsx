"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  RecipeCreateForm,
  type RecipeEditData,
} from "@/features/recipes/components/RecipeCreateForm";

type AdminReport = {
  id: string;
  reason: string;
  details?: string;
  createdAt: string;
  reporterName: string;
  post: { id: string; title: string; content: string; authorName: string } | null;
};

export function AdminReportActions({ report }: { report: AdminReport }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function review(action: "hide" | "dismiss") {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reports/${report.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Could not update this report.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending || !report.post} onClick={() => review("hide")}>
        Hide post
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => review("dismiss")}>
        Dismiss report
      </Button>
      {error && (
        <p role="alert" className="text-warning basis-full text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

export function AdminRecipeCard({ recipe }: { recipe: RecipeEditData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(`Delete "${recipe.title}" from the recipe catalogue?`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Could not delete this recipe.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">{recipe.title}</h3>
          <p className="text-sm text-muted">
            {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
            {editing ? "Close" : "Edit"}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={remove}>
            Delete
          </Button>
        </div>
      </div>
      {editing && <RecipeCreateForm key={recipe.id} recipe={recipe} />}
      {error && (
        <p role="alert" className="text-warning text-sm">
          {error}
        </p>
      )}
    </Card>
  );
}
