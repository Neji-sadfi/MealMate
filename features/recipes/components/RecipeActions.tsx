"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Heart, LoaderCircle, Share2, Trash2 } from "lucide-react";
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
  const t = useTranslations("pages.recipeDetail.actions");
  const [favorite, setFavorite] = useState(isFavorite);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  async function toggleFavorite() {
    setPending(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId }),
      });
      const result = (await response.json()) as { favorite?: boolean; error?: string };
      if (!response.ok || typeof result.favorite !== "boolean") {
        setError(result.error ?? t("favoriteError"));
        return;
      }
      setFavorite(result.favorite);
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function shareRecipe() {
    setError("");
    setFeedback("");
    const shareData = { title, url: window.location.href };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setFeedback(t("shared"));
        return;
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return;
    }

    try {
      await navigator.clipboard.writeText(shareData.url);
      setFeedback(t("linkCopied"));
    } catch {
      setError(t("shareError"));
    }
  }

  async function deleteRecipe() {
    if (!window.confirm(t("deleteConfirm", { title }))) return;
    setPending(true);
    setError("");
    setFeedback("");
    try {
      const response = await fetch(`/api/recipes/${recipeId}`, { method: "DELETE" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("deleteError"));
        return;
      }
      router.push("/recipes");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={toggleFavorite}
          aria-pressed={favorite}
          icon={pending ? LoaderCircle : Heart}
          className={`${favorite ? "text-rose-600 [&_svg]:fill-current" : ""} ${pending ? "[&_svg]:animate-spin" : ""}`}
        >
          {favorite ? t("removeFavorite") : t("addFavorite")}
        </Button>
        <Button variant="ghost" onClick={shareRecipe} icon={Share2}>
          {t("share")}
        </Button>
        {canDelete && (
          <Button
            variant="ghost"
            disabled={pending}
            onClick={deleteRecipe}
            icon={Trash2}
            className="text-warning hover:bg-warning-bg"
          >
            {t("delete")}
          </Button>
        )}
      </div>
      {feedback && (
        <p role="status" className="text-sm text-primary">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="text-warning text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
