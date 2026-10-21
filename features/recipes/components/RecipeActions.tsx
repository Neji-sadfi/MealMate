"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export function RecipeActions({
  recipeId,
  title,
  isFavorite,
  canDelete,
}: {
  recipeId: string;
  title: string;
  isFavorite: boolean;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(isFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggleFavorite() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const result = (await response.json()) as { favorite?: boolean; error?: string };
      if (!response.ok || typeof result.favorite !== "boolean") {
        setError(result.error ?? "Could not update favorite.");
        return;
      }
      setFavorite(result.favorite);
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function deleteRecipe() {
    if (!window.confirm(`Delete "${title}"?`)) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? "Could not delete this recipe.");
        return;
      }
      router.push("/recipes");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" disabled={pending} onClick={toggleFavorite}>
        {favorite ? "Remove from favorites" : "Add to favorites"}
      </Button>
      {canDelete && (
        <Button variant="ghost" disabled={pending} onClick={deleteRecipe}>
          Delete recipe
        </Button>
      )}
      {error && (
        <p role="alert" className="text-warning basis-full text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
