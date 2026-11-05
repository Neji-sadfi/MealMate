"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("pages.admin.actions");
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
        setError(t("reportError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={pending || !report.post} onClick={() => review("hide")}>
        {t("hidePost")}
      </Button>
      <Button variant="secondary" disabled={pending} onClick={() => review("dismiss")}>
        {t("dismiss")}
      </Button>
      {error && (
        <p role="alert" className="basis-full text-sm text-warning">
          {error}
        </p>
      )}
    </div>
  );
}

export function AdminRecipeCard({ recipe }: { recipe: RecipeEditData }) {
  const router = useRouter();
  const t = useTranslations("pages.admin.actions");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (!window.confirm(t("deleteConfirm", { title: recipe.title }))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t("recipeError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
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
            {t("recipeSummary", {
              ingredients: recipe.ingredients.length,
              steps: recipe.steps.length,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditing((current) => !current)}>
            {editing ? t("close") : t("edit")}
          </Button>
          <Button variant="ghost" disabled={pending} onClick={remove}>
            {t("delete")}
          </Button>
        </div>
      </div>
      {editing && <RecipeCreateForm key={recipe.id} recipe={recipe} />}
      {error && (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      )}
    </Card>
  );
}
