"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Check,
  Circle,
  LoaderCircle,
  Minus,
  Plus,
  ReceiptText,
  Search,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AISLES, type Aisle } from "@/models/enums";

type ShoppingItem = {
  _id: string;
  name: string;
  aisle: Aisle;
  quantity?: number;
  unit: "g" | "kg" | "ml" | "l" | "piece" | "tbsp" | "tsp" | "bunch" | "pot" | "to_taste";
  estimatedPrice?: number;
  catalogPrice?: number;
  catalogPriceLabel?: string;
  catalogProductName?: string;
  catalogSearchUrl?: string;
  catalogStore?: string;
  checked: boolean;
  actualPrice?: number;
};

type ListFilter = "all" | "open" | "checked";
type BudgetSummary = { limit: number; spent: number; currency: string };

type CatalogMatch = {
  itemId: string;
  itemName: string;
  product: {
    name: string;
    price: number;
    priceLabel: string;
    currency: string;
    searchUrl: string;
  } | null;
} | null;

const GEANT_STORE_URL = "https://www.geantdrive.tn/tunis-city/";

function estimatedCost(item: ShoppingItem): number | null {
  if (item.estimatedPrice === undefined) return null;
  const amount = item.quantity ?? 1;
  const scale =
    item.unit === "g" || item.unit === "ml"
      ? amount / 1000
      : item.unit === "tbsp"
        ? (amount * 15) / 1000
        : item.unit === "tsp"
          ? (amount * 5) / 1000
          : amount;
  return item.estimatedPrice * scale;
}

export function ShoppingActions({
  items,
  initialBudget,
}: {
  items: ShoppingItem[];
  initialBudget: BudgetSummary;
}) {
  const router = useRouter();
  const t = useTranslations("pages.shopping");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [catalogConsent, setCatalogConsent] = useState(false);
  const [catalogPending, setCatalogPending] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [catalogMatches, setCatalogMatches] = useState<NonNullable<CatalogMatch>[]>([]);
  const [catalogCheckedAt, setCatalogCheckedAt] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("open");
  const [busyItem, setBusyItem] = useState("");
  const [budgetSpent, setBudgetSpent] = useState(initialBudget.spent);
  const [purchaseItem, setPurchaseItem] = useState<ShoppingItem | null>(null);
  const [purchasePrice, setPurchasePrice] = useState("");
  const currencyLabel = initialBudget.currency === "TND" ? "DT" : initialBudget.currency;
  const formatMoney = (amount: number) => `${amount.toFixed(2)} ${currencyLabel}`;
  const checkedCount = items.filter((item) => item.checked).length;
  const openCount = items.length - checkedCount;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
  const remainingBudget = initialBudget.limit - budgetSpent;
  const budgetProgress =
    initialBudget.limit > 0
      ? Math.min(100, Math.round((budgetSpent / initialBudget.limit) * 100))
      : 0;
  const total = items
    .filter((item) => !item.checked)
    .reduce((sum, item) => sum + (estimatedCost(item) ?? 0), 0);
  const estimatedCount = items.filter(
    (item) => !item.checked && estimatedCost(item) !== null,
  ).length;
  const catalogItems = items.filter(
    (item) => !item.checked && item.catalogStore === "geant" && item.catalogPrice !== undefined,
  );
  const filteredItems = items.filter((item) => {
    const matchesQuery = item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesFilter = filter === "all" || (filter === "open" ? !item.checked : item.checked);
    return matchesQuery && matchesFilter;
  });
  const groupedItems = AISLES.map((aisle) => ({
    aisle,
    items: filteredItems.filter((item) => item.aisle === aisle),
  })).filter((group) => group.items.length > 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const rawPrice = data.get("estimatedPrice");
      const response = await fetch("/api/shopping-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          quantity: Number(data.get("quantity") || 1),
          unit: data.get("unit") || "piece",
          ...(rawPrice ? { estimatedPrice: Number(rawPrice) } : {}),
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.add"));
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setPending(false);
    }
  }

  async function toggle(item: ShoppingItem, paidPrice?: number): Promise<boolean> {
    setError("");
    setBusyItem(item._id);
    try {
      const response = await fetch(`/api/shopping-items/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checked: !item.checked,
          ...(!item.checked && paidPrice !== undefined ? { purchasePrice: paidPrice } : {}),
        }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.update"));
        return false;
      }
      if (item.checked) {
        setBudgetSpent((spent) => Math.max(0, spent - (item.actualPrice ?? 0)));
      } else {
        setBudgetSpent((spent) => spent + (paidPrice ?? 0));
      }
      router.refresh();
      return true;
    } catch {
      setError(t("errors.network"));
      return false;
    } finally {
      setBusyItem("");
    }
  }

  async function confirmPurchase(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!purchaseItem || purchasePrice.trim() === "") return;
    const paidPrice = Number(purchasePrice);
    if (!Number.isFinite(paidPrice) || paidPrice < 0) {
      setError(t("errors.price"));
      return;
    }
    if (await toggle(purchaseItem, paidPrice)) {
      setPurchaseItem(null);
      setPurchasePrice("");
    }
  }

  async function changeQuantity(item: ShoppingItem, direction: -1 | 1) {
    const step =
      item.unit === "g" || item.unit === "ml"
        ? 50
        : item.unit === "kg" || item.unit === "l"
          ? 0.1
          : 1;
    const quantity = Math.max(0, Number(((item.quantity ?? 1) + step * direction).toFixed(2)));
    setError("");
    setBusyItem(item._id);
    try {
      const response = await fetch(`/api/shopping-items/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) {
        setError(t("errors.update"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusyItem("");
    }
  }

  async function removeItem(item: ShoppingItem) {
    if (!window.confirm(t("itemActions.confirmRemove", { name: item.name }))) return;
    setError("");
    setBusyItem(item._id);
    try {
      const response = await fetch(`/api/shopping-items/${item._id}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t("errors.update"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusyItem("");
    }
  }

  async function generate() {
    setGenerating(true);
    setError("");
    setCatalogNotice("");
    setCatalogWarning("");
    try {
      const response = await fetch("/api/shopping-lists/generate", { method: "POST" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.generate"));
        return;
      }
      const result = (await response.json()) as {
        items?: Array<{ _id?: unknown; checked?: unknown }>;
      };
      if (catalogConsent) {
        const uncheckedItems = (result.items ?? []).filter(
          (item): item is { _id: string; checked: false } =>
            item.checked === false && typeof item._id === "string",
        );
        const itemIds = uncheckedItems.slice(0, 12).map((item) => item._id);
        if (itemIds.length > 0) {
          const searchSucceeded = await searchCatalog(itemIds);
          router.refresh();
          if (uncheckedItems.length > itemIds.length) {
            setCatalogWarning((warning) =>
              [
                searchSucceeded ? "" : warning,
                t("catalog.limitNotice", { count: uncheckedItems.length - itemIds.length }),
              ]
                .filter(Boolean)
                .join(" "),
            );
          }
        } else {
          setCatalogNotice(t("catalog.noItemsToSearch"));
          router.refresh();
        }
      } else {
        setCatalogWarning(t("catalog.consentNeeded"));
        router.refresh();
      }
    } catch {
      setError(t("errors.generate"));
      router.refresh();
    } finally {
      setGenerating(false);
    }
  }

  async function searchCatalog(itemIds?: string[]): Promise<boolean> {
    const ids =
      itemIds ??
      items
        .filter((item) => !item.checked)
        .slice(0, 12)
        .map(({ _id }) => _id);
    if (ids.length === 0) {
      setCatalogNotice(t("catalog.noItemsToSearch"));
      return false;
    }

    setCatalogPending(true);
    setCatalogNotice("");
    setCatalogWarning("");
    setCatalogCheckedAt("");
    setError("");
    try {
      const response = await fetch("/api/shopping-price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: ids }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        unmatchedCount?: number;
        checkedAt?: string;
        results?: CatalogMatch[];
      } | null;
      if (!response.ok || !result?.results) {
        setCatalogWarning(result?.error ?? t("errors.catalog"));
        return false;
      }
      setCatalogMatches(
        result.results.filter((match): match is NonNullable<CatalogMatch> => match !== null),
      );
      setCatalogNotice(t("catalog.completed"));
      setCatalogWarning(
        result.unmatchedCount ? t("catalog.partial", { count: result.unmatchedCount }) : "",
      );
      setCatalogCheckedAt(result.checkedAt ?? "");
      router.refresh();
      return true;
    } catch {
      setCatalogWarning(t("errors.network"));
      return false;
    } finally {
      setCatalogPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <details className="group rounded-[1.5rem] border border-primary/10 bg-surface shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-[1.5rem] bg-gradient-to-br from-primary/10 via-surface p-4 marker:hidden sm:px-5">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShoppingBasket aria-hidden className="size-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-lg font-bold">{t("estimate.title")}</span>
              <span className="mt-1 block text-xs text-muted">{t("estimate.description")}</span>
            </span>
          </span>
          <span className="shrink-0 rounded-2xl bg-background/80 px-3 py-2 text-right">
            <p className="text-xs font-medium text-muted">{t("estimate.total")}</p>
            <p className="mt-0.5 text-lg font-black text-primary">
              {estimatedCount > 0 ? formatMoney(total) : t("estimate.noPrice")}
            </p>
          </span>
        </summary>
        <Card className="border-0 pt-0 shadow-none">
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">{t("estimate.storeLabel")}</span>
              <span className="h-12 content-center rounded-input border border-border bg-background px-3 font-medium">
                Géant Drive Tunis City
              </span>
            </div>
            <a
              href={GEANT_STORE_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-input border border-border bg-background px-4 text-sm font-semibold text-primary hover:bg-tint"
            >
              {t("catalog.openStore")} <ArrowUpRight aria-hidden className="size-4" />
            </a>
            <Button
              type="button"
              variant="secondary"
              disabled={!catalogConsent || catalogPending || items.every((item) => item.checked)}
              onClick={() => void searchCatalog()}
            >
              {catalogPending ? (
                <LoaderCircle aria-hidden className="size-4 animate-spin" />
              ) : (
                <Search aria-hidden className="size-4" />
              )}
              {catalogPending ? t("catalog.searching") : t("catalog.search")}
            </Button>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-background/70 p-3 text-xs leading-relaxed text-muted">
            <Sparkles aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>
              {estimatedCount > 0
                ? t("estimate.referenceNote", { count: estimatedCount })
                : t("estimate.missingPrices")}
              {estimatedCount > 0 && estimatedCount < openCount
                ? ` ${t("estimate.partialNote", { count: openCount - estimatedCount })}`
                : ""}
            </p>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">{t("catalog.scopeNote")}</p>

          {catalogNotice && (
            <p role="status" className="mt-3 text-sm font-medium text-success">
              {catalogNotice}
            </p>
          )}
          {items.filter((item) => !item.checked).length > 12 && (
            <p className="mt-2 text-xs text-muted">
              {t("catalog.limitNotice", {
                count: items.filter((item) => !item.checked).length - 12,
              })}
            </p>
          )}
          {catalogWarning && (
            <p role="status" className="mt-2 text-xs text-muted">
              {catalogWarning}
            </p>
          )}
          {catalogCheckedAt && (
            <p className="mt-2 text-xs text-muted">
              {t("catalog.checkedAt", { date: new Date(catalogCheckedAt).toLocaleString() })}
            </p>
          )}
          {catalogItems.length > 0 && (
            <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
              <p className="text-sm font-semibold text-primary">
                {t("catalog.matchingPrices", { count: catalogItems.length })}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {t("catalog.packPriceNote")}
              </p>
            </div>
          )}
          {catalogMatches.length > 0 && (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {catalogMatches.map((match, index) => (
                <li
                  key={`${match.itemName}-${index}`}
                  className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/75 p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{match.itemName}</p>
                    {match.product ? (
                      <a
                        href={match.product.searchUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-muted hover:text-primary"
                      >
                        <span className="truncate">{match.product.name}</span>
                        <ArrowUpRight aria-hidden className="size-3 shrink-0" />
                      </a>
                    ) : (
                      <p className="mt-1 text-xs text-muted">{t("catalog.noMatch")}</p>
                    )}
                  </div>
                  {match.product && (
                    <span className="shrink-0 font-bold text-primary">
                      {match.product.priceLabel}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {catalogMatches.length > 0 && (
            <p className="mt-2 text-xs text-muted">{t("catalog.packPriceNote")}</p>
          )}
        </Card>
      </details>

      <Card className="overflow-hidden border border-primary/10 bg-gradient-to-br from-primary/10 via-surface to-surface p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Wallet aria-hidden className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">{t("budget.title")}</h2>
              <p className="mt-1 text-sm text-muted">
                {items.length > 0
                  ? t("progress.items", { checked: checkedCount, total: items.length })
                  : t("empty.title")}
              </p>
            </div>
          </div>
          <Link
            href="/tracking"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border bg-background/80 px-3 text-sm font-semibold text-primary transition-colors hover:bg-tint"
          >
            <ReceiptText aria-hidden className="size-4" />
            {t("budget.manage")}
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-border/70 bg-background/75 p-3 sm:gap-4 sm:p-4">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{t("budget.spent")}</p>
            <p className="mt-1 truncate text-base font-black text-primary sm:text-lg">
              {formatMoney(budgetSpent)}
            </p>
          </div>
          <div className="min-w-0 border-x border-border/70 px-2 sm:px-4">
            <p className="text-xs font-medium text-muted">{t("budget.limit")}</p>
            <p className="mt-1 truncate text-base font-bold sm:text-lg">
              {initialBudget.limit > 0 ? formatMoney(initialBudget.limit) : t("budget.noLimit")}
            </p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-xs font-medium text-muted">{t("budget.remaining")}</p>
            <p
              className={`mt-1 truncate text-base font-bold sm:text-lg ${
                remainingBudget < 0 ? "text-danger" : "text-foreground"
              }`}
            >
              {formatMoney(Math.max(0, remainingBudget))}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <span className="font-medium text-muted">
            {initialBudget.limit > 0
              ? t("budget.progress", {
                  percent: Math.round((budgetSpent / initialBudget.limit) * 100),
                })
              : t("budget.addLimit")}
          </span>
          {openCount === 0 && items.length > 0 ? (
            <span className="font-semibold text-success">{t("progress.complete")}</span>
          ) : (
            <span className="font-semibold text-muted">
              {t("progress.remaining", { count: openCount })}
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={t("budget.title")}
          aria-valuemin={0}
          aria-valuemax={initialBudget.limit || 100}
          aria-valuenow={Math.min(budgetSpent, initialBudget.limit || 100)}
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-background"
        >
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              remainingBudget < 0 ? "bg-danger" : "bg-primary"
            }`}
            style={{ width: `${initialBudget.limit > 0 ? budgetProgress : progress}%` }}
          />
        </div>
      </Card>

      <section aria-label={t("filters.label")} className="flex flex-col gap-3">
        <label className="relative block">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          />
          <input
            aria-label={t("filters.search")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className="h-12 w-full rounded-input border border-border bg-surface pr-4 pl-10 text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("filters.label")}>
          {(["open", "all", "checked"] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                filter === value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-surface text-muted hover:text-primary"
              }`}
            >
              {t(`filters.${value}`)}
              <span className="ml-1.5 opacity-75">
                {value === "open" ? openCount : value === "checked" ? checkedCount : items.length}
              </span>
            </button>
          ))}
        </div>
      </section>

      {items.length > 0 && filteredItems.length === 0 && (
        <Card className="border border-border/70 text-center">
          <p className="font-semibold">{t("empty.filteredTitle")}</p>
          <p className="mt-1 text-sm text-muted">{t("empty.filteredBody")}</p>
        </Card>
      )}
      {groupedItems.map((group) => (
        <section
          key={group.aisle}
          aria-label={`${t("filters.aisle")}: ${t(`aisles.${group.aisle}`)}`}
        >
          <h2 className="mb-2 flex items-center justify-between px-1 text-sm font-bold text-muted">
            <span>{t(`aisles.${group.aisle}`)}</span>
            <span>{group.items.length}</span>
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => {
              const price =
                item.catalogStore === "geant" && item.catalogPrice !== undefined
                  ? item.catalogPrice
                  : estimatedCost(item);
              const hasCatalogPrice =
                item.catalogStore === "geant" && item.catalogPrice !== undefined;
              const displayedPrice =
                item.checked && item.actualPrice !== undefined
                  ? formatMoney(item.actualPrice)
                  : hasCatalogPrice
                    ? (item.catalogPriceLabel ?? `${item.catalogPrice?.toFixed(3)} DT`)
                    : price === null
                      ? t("estimate.noPrice")
                      : formatMoney(price);
              const itemBusy = busyItem === item._id;
              return (
                <li key={item._id}>
                  <Card
                    className={`flex flex-col gap-3 border border-border/70 p-3 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:p-4 ${
                      item.checked ? "bg-background/70" : "bg-surface"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <button
                        type="button"
                        aria-label={`${item.checked ? t("filters.open") : t("purchase.markBought")}: ${item.name}`}
                        aria-pressed={item.checked}
                        disabled={itemBusy}
                        onClick={() => {
                          if (item.checked) {
                            void toggle(item);
                          } else {
                            setError("");
                            setPurchaseItem(item);
                            const estimate = estimatedCost(item);
                            setPurchasePrice(estimate === null ? "" : estimate.toFixed(2));
                          }
                        }}
                        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl transition-colors disabled:opacity-50 ${
                          item.checked
                            ? "bg-primary text-primary-foreground"
                            : "bg-tint text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {itemBusy ? (
                          <LoaderCircle aria-hidden className="size-5 animate-spin" />
                        ) : item.checked ? (
                          <Check aria-hidden className="size-5" />
                        ) : (
                          <Circle aria-hidden className="size-5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate font-semibold ${item.checked ? "text-muted" : ""}`}>
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted">
                          {item.checked && item.actualPrice !== undefined
                            ? t("purchase.paid", { amount: displayedPrice })
                            : displayedPrice}
                          {hasCatalogPrice && !item.checked
                            ? ` · ${t("catalog.productPrice")}`
                            : ""}
                        </p>
                        {hasCatalogPrice && item.catalogSearchUrl && !item.checked && (
                          <a
                            href={item.catalogSearchUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="mt-1 block truncate text-xs text-primary hover:underline"
                          >
                            {item.catalogProductName}
                          </a>
                        )}
                      </div>
                      {!item.checked && (
                        <span className="hidden shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary sm:inline-flex">
                          {t("purchase.toBuy")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t border-border/60 pt-2">
                      <div className="flex items-center gap-1 rounded-full bg-background px-1">
                        <button
                          type="button"
                          aria-label={`${t("itemActions.decrease")} ${item.name}`}
                          disabled={itemBusy || item.checked || (item.quantity ?? 1) <= 0}
                          onClick={() => void changeQuantity(item, -1)}
                          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-primary disabled:opacity-40"
                        >
                          <Minus aria-hidden className="size-4" />
                        </button>
                        <span className="min-w-16 text-center text-xs font-semibold">
                          {item.quantity ?? 1} {t(`units.${item.unit}`)}
                        </span>
                        <button
                          type="button"
                          aria-label={`${t("itemActions.increase")} ${item.name}`}
                          disabled={itemBusy || item.checked}
                          onClick={() => void changeQuantity(item, 1)}
                          className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-primary disabled:opacity-40"
                        >
                          <Plus aria-hidden className="size-4" />
                        </button>
                        <button
                          type="button"
                          aria-label={`${t("itemActions.remove")} ${item.name}`}
                          disabled={itemBusy}
                          onClick={() => void removeItem(item)}
                          className="ml-1 flex size-9 items-center justify-center rounded-full text-muted hover:bg-warning-bg hover:text-danger disabled:opacity-40"
                        >
                          <Trash2 aria-hidden className="size-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Card className="border border-primary/10 bg-gradient-to-br from-tint/80 to-surface p-4 shadow-sm">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={catalogConsent}
            onChange={(event) => setCatalogConsent(event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>
            <span className="block font-semibold text-foreground">
              {t("catalog.autoSearchLabel")}
            </span>
            <span className="mt-1 block text-xs text-muted">{t("catalog.consent")}</span>
          </span>
        </label>
        <Button
          type="button"
          fullWidth
          disabled={generating || catalogPending}
          onClick={() => void generate()}
          className="mt-4"
        >
          {generating ? (
            <>
              <LoaderCircle aria-hidden className="size-4 animate-spin" />
              {catalogPending ? t("catalog.searching") : t("generating")}
            </>
          ) : (
            <>
              <ShoppingBasket aria-hidden className="size-4" />
              {t("generate")}
            </>
          )}
        </Button>
        {catalogNotice && (
          <p role="status" className="mt-3 text-sm font-medium text-success">
            {catalogNotice}
          </p>
        )}
        {catalogWarning && (
          <p role="status" className="mt-3 text-sm leading-relaxed text-muted">
            {catalogWarning}
          </p>
        )}
      </Card>

      <details className="group rounded-[1.5rem] border border-border/70 bg-surface p-4 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-bold marker:hidden">
          <Store aria-hidden className="size-4 text-primary" />
          {t("add.title")}
          <span className="ml-auto text-sm font-medium text-muted transition-transform group-open:rotate-45">
            +
          </span>
        </summary>
        <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input name="name" label={t("add.name")} required maxLength={120} />
          <Input name="estimatedPrice" label={t("add.price")} type="number" min="0" step="0.01" />
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Input
              name="quantity"
              label={t("add.quantity")}
              type="number"
              min="0"
              step="any"
              defaultValue="1"
            />
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t("add.unit")}
              <select
                name="unit"
                className="h-12 rounded-input border border-border bg-background px-3"
              >
                <option value="piece">{t("units.piece")}</option>
                <option value="g">{t("units.g")}</option>
                <option value="kg">{t("units.kg")}</option>
                <option value="ml">{t("units.ml")}</option>
                <option value="l">{t("units.l")}</option>
                <option value="bunch">{t("units.bunch")}</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-muted sm:col-span-2">{t("add.priceHint")}</p>
          <Button type="submit" fullWidth disabled={pending} className="sm:col-span-2">
            {pending ? t("add.saving") : t("add.submit")}
          </Button>
        </form>
      </details>
      {purchaseItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="purchase-dialog-title"
            className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="purchase-dialog-title" className="text-lg font-bold">
                  {t("purchase.title")}
                </h2>
                <p className="mt-1 text-sm text-muted">{purchaseItem.name}</p>
              </div>
              <button
                type="button"
                aria-label={t("purchase.cancel")}
                onClick={() => setPurchaseItem(null)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-primary"
              >
                <X aria-hidden className="size-5" />
              </button>
            </div>
            <form onSubmit={confirmPurchase} className="mt-5 flex flex-col gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t("purchase.priceLabel")}
                <span className="relative">
                  <input
                    autoFocus
                    required
                    min="0"
                    step="0.01"
                    type="number"
                    inputMode="decimal"
                    value={purchasePrice}
                    onChange={(event) => setPurchasePrice(event.target.value)}
                    className="h-12 w-full rounded-input border border-border bg-background px-3 pr-14 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted">
                    {currencyLabel}
                  </span>
                </span>
              </label>
              <p className="text-xs leading-relaxed text-muted">
                {t("purchase.budgetHint")}
                {estimatedCost(purchaseItem) !== null
                  ? ` ${t("purchase.estimateHint", {
                      amount: formatMoney(estimatedCost(purchaseItem) ?? 0),
                    })}`
                  : ""}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setPurchaseItem(null)}
                  disabled={busyItem === purchaseItem._id}
                >
                  {t("purchase.cancel")}
                </Button>
                <Button type="submit" disabled={busyItem === purchaseItem._id}>
                  {busyItem === purchaseItem._id ? t("purchase.saving") : t("purchase.confirm")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
