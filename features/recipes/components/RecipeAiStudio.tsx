"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bot, ChefHat, LoaderCircle, Save, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { GeneratedRecipe } from "@/features/recipes/ai-schemas";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AiErrorMessageKey =
  | "notConfigured"
  | "keyInvalid"
  | "rateLimited"
  | "timeout"
  | "unavailable"
  | "invalidResponse"
  | "invalidRecipe"
  | "invalidInput"
  | "unknownError";

const errorMessages: Record<string, AiErrorMessageKey> = {
  AI_NOT_CONFIGURED: "notConfigured",
  AI_KEY_INVALID: "keyInvalid",
  AI_RATE_LIMITED: "rateLimited",
  AI_TIMEOUT: "timeout",
  AI_UNAVAILABLE: "unavailable",
  AI_PROVIDER_ERROR: "unavailable",
  AI_INVALID_RESPONSE: "invalidResponse",
  AI_INVALID_RECIPE: "invalidRecipe",
  INVALID_INPUT: "invalidInput",
};

export function RecipeAiStudio() {
  const t = useTranslations("pages.recipes.ai");
  const router = useRouter();
  const [mode, setMode] = useState<"generate" | "chat">("generate");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");

  function errorText(code?: string) {
    return t(errorMessages[code ?? ""] ?? "unknownError");
  }

  async function generateRecipe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setRecipe(null);
    const data = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/recipe-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "generate",
          ingredients: data.get("ingredients"),
          goal: data.get("goal"),
          servings: Number(data.get("servings")),
          maxTime: Number(data.get("maxTime")),
          consent,
        }),
      });
      const result = (await response.json()) as { recipe?: GeneratedRecipe; error?: string };
      if (!response.ok || !result.recipe) {
        setError(errorText(result.error));
        return;
      }
      setRecipe(result.recipe);
    } catch {
      setError(t("unavailable"));
    } finally {
      setPending(false);
    }
  }

  async function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    setPending(true);
    setError("");

    try {
      const history = messages.slice(-8).map((message) => ({
        ...message,
        content: message.role === "assistant" ? message.content.slice(0, 4000) : message.content,
      }));
      const response = await fetch("/api/recipe-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "chat",
          message: trimmedQuestion,
          history,
          consent,
        }),
      });
      const result = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !result.answer) {
        setError(errorText(result.error));
        return;
      }
      setMessages((current) => [
        ...current,
        { role: "user", content: trimmedQuestion },
        { role: "assistant", content: result.answer! },
      ]);
      setQuestion("");
    } catch {
      setError(t("unavailable"));
    } finally {
      setPending(false);
    }
  }

  async function saveRecipe() {
    if (!recipe) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(recipe),
      });
      const result = (await response.json().catch(() => null)) as {
        _id?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?._id) {
        setError(result?.error ?? t("saveError"));
        return;
      }
      router.push(`/recipes/${result._id}`);
      router.refresh();
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-[1.5rem] border border-primary/10 bg-surface shadow-[0_20px_60px_-36px_rgba(28,43,35,0.3)]">
      <div className="flex flex-col gap-4 bg-gradient-to-br from-tint/90 via-surface to-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles aria-hidden className="size-5" />
          </span>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
              {t("eyebrow")}
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight">{t("title")}</h2>
            <p className="mt-1 text-sm text-muted">{t("subtitle")}</p>
          </div>
        </div>
        <div
          role="tablist"
          aria-label={t("modesLabel")}
          className="flex rounded-full bg-background p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "generate"}
            onClick={() => setMode("generate")}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${mode === "generate" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            <ChefHat aria-hidden className="size-4" />
            {t("generateTab")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "chat"}
            onClick={() => setMode("chat")}
            className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition-colors ${mode === "chat" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            <Bot aria-hidden className="size-4" />
            {t("chatTab")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <label className="flex items-start gap-3 rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>{t("privacyNotice")}</span>
        </label>

        {mode === "generate" ? (
          <div role="tabpanel" className="flex flex-col gap-5">
            <form onSubmit={generateRecipe} className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
                {t("ingredientsLabel")}
                <input
                  name="ingredients"
                  maxLength={300}
                  placeholder={t("ingredientsPlaceholder")}
                  className="h-11 rounded-input border border-border bg-background px-3 font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold sm:col-span-2">
                {t("goalLabel")}
                <input
                  name="goal"
                  maxLength={250}
                  placeholder={t("goalPlaceholder")}
                  className="h-11 rounded-input border border-border bg-background px-3 font-normal"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("servingsLabel")}
                <input
                  name="servings"
                  type="number"
                  min="1"
                  max="12"
                  defaultValue="2"
                  required
                  className="h-11 rounded-input border border-border bg-background px-3"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("timeLabel")}
                <input
                  name="maxTime"
                  type="number"
                  min="5"
                  max="240"
                  defaultValue="30"
                  required
                  className="h-11 rounded-input border border-border bg-background px-3"
                />
              </label>
              <Button
                type="submit"
                fullWidth
                disabled={!consent || pending || saving}
                icon={pending ? LoaderCircle : Sparkles}
                className={`sm:col-span-2 ${pending ? "[&_svg]:animate-spin" : ""}`}
              >
                {pending ? t("generating") : t("generateButton")}
              </Button>
            </form>

            {recipe && (
              <article className="flex flex-col gap-4 rounded-2xl border border-border bg-background/60 p-4 sm:p-5">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                    {t("generatedLabel")}
                  </p>
                  <h3 className="mt-1 text-2xl font-black tracking-tight">{recipe.title}</h3>
                  <p className="mt-1 text-sm text-muted">{recipe.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed">{recipe.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold text-primary">
                  <span className="rounded-full bg-tint px-3 py-1.5">
                    {recipe.prepTimeMinutes} min
                  </span>
                  <span className="rounded-full bg-tint px-3 py-1.5">
                    {recipe.nutrition.calories} kcal / {t("servingUnit")}
                  </span>
                  <span className="rounded-full bg-tint px-3 py-1.5">
                    {recipe.nutrition.protein} g {t("protein")}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="font-bold">{t("ingredientsTitle")}</h4>
                    <ul className="mt-2 space-y-1.5 text-sm text-muted">
                      {recipe.ingredients.map((ingredient, index) => (
                        <li key={`${ingredient.name}-${index}`}>
                          {ingredient.quantity} {ingredient.unit} {ingredient.name}
                          {ingredient.note ? ` · ${ingredient.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold">{t("stepsTitle")}</h4>
                    <ol className="mt-2 space-y-2 text-sm text-muted">
                      {recipe.steps.map((step) => (
                        <li key={step.order}>
                          <span className="font-semibold text-foreground">
                            {step.order}. {step.title}
                          </span>
                          <span className="block">{step.description}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
                <p className="text-xs text-muted">{t("estimateNote")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving || pending}
                  onClick={saveRecipe}
                  icon={saving ? LoaderCircle : Save}
                  className={saving ? "[&_svg]:animate-spin" : ""}
                >
                  {saving ? t("saving") : t("saveRecipe")}
                </Button>
              </article>
            )}
          </div>
        ) : (
          <div role="tabpanel" className="flex flex-col gap-4">
            <div
              aria-live="polite"
              className="flex max-h-96 min-h-36 flex-col gap-3 overflow-y-auto rounded-2xl bg-background/70 p-4"
            >
              {messages.length === 0 ? (
                <div className="m-auto max-w-sm py-5 text-center">
                  <Bot aria-hidden className="mx-auto size-8 text-primary" />
                  <p className="mt-2 text-sm font-semibold">{t("chatWelcome")}</p>
                  <p className="mt-1 text-xs text-muted">{t("chatSuggestion")}</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <p
                    key={`${message.role}-${index}`}
                    className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                      message.role === "user"
                        ? "self-end rounded-br-md bg-primary text-primary-foreground"
                        : "self-start rounded-bl-md bg-surface shadow-sm"
                    }`}
                  >
                    {message.content}
                  </p>
                ))
              )}
              {pending && (
                <p
                  role="status"
                  className="flex items-center gap-2 self-start rounded-2xl bg-surface px-4 py-3 text-sm text-muted shadow-sm"
                >
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  {t("thinking")}
                </p>
              )}
            </div>
            <form onSubmit={askAssistant} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="recipe-ai-question">
                {t("questionLabel")}
              </label>
              <input
                id="recipe-ai-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                maxLength={1200}
                placeholder={t("questionPlaceholder")}
                className="h-12 min-w-0 flex-1 rounded-full border border-border bg-background px-5"
              />
              <Button
                type="submit"
                disabled={!consent || !question.trim() || pending || saving}
                icon={pending ? LoaderCircle : Send}
                className={`rounded-full ${pending ? "[&_svg]:animate-spin" : ""}`}
              >
                {t("send")}
              </Button>
            </form>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-xl bg-warning-bg px-4 py-3 text-sm text-foreground">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
