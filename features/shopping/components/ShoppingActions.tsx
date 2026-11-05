"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowUpRight,
  Check,
  Circle,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AISLES, type Aisle } from "@/models/enums";
import { estimatedItemCost as estimatedCost } from "../services/cost";

type ShoppingItem = {
  _id: string;
  name: string;
  aisle: Aisle;
  quantity?: number;
  unit: "g" | "kg" | "ml" | "l" | "piece" | "tbsp" | "tsp" | "bunch" | "pot" | "to_taste";
  estimatedPrice?: number;
  catalogPrice?: number;
  catalogProductName?: string;
  catalogSearchUrl?: string;
  catalogStore?: string;
  checked: boolean;
};

type StoreId = "carrefour" | "carrefour-market" | "monoprix" | "geant" | "mg";
type ListFilter = "all" | "open" | "checked";

type CatalogMatch = {
  itemId: string;
  itemName: string;
  product: { name: string; price: number; currency: string; searchUrl: string } | null;
} | null;

const STORES: { id: StoreId; name: string }[] = [
  { id: "carrefour", name: "Carrefour" },
  { id: "carrefour-market", name: "Carrefour Market" },
  { id: "monoprix", name: "Monoprix" },
  { id: "geant", name: "Géant" },
  { id: "mg", name: "MG" },
];

const STORE_URLS: Partial<Record<StoreId, string>> = {
  carrefour: "https://www.carrefour.tn",
  monoprix: "https://www.monoprix.tn",
  geant: "https://www.geant.tn",
};

export function ShoppingActions({ items }: { items: ShoppingItem[] }) {
  const router = useRouter();
  const t = useTranslations("pages.shopping");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [store, setStore] = useState<StoreId>("carrefour");
  const [catalogConsent, setCatalogConsent] = useState(false);
  const [catalogPending, setCatalogPending] = useState(false);
  const [catalogNotice, setCatalogNotice] = useState("");
  const [catalogWarning, setCatalogWarning] = useState("");
  const [catalogMatches, setCatalogMatches] = useState<NonNullable<CatalogMatch>[]>([]);
  const [catalogCheckedAt, setCatalogCheckedAt] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ListFilter>("open");
  const [busyItem, setBusyItem] = useState("");
  const checkedCount = items.filter((item) => item.checked).length;
  const openCount = items.length - checkedCount;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;
  const total = items
    .filter((item) => !item.checked)
    .reduce((sum, item) => sum + (estimatedCost(item) ?? 0), 0);
  const estimatedCount = items.filter(
    (item) => !item.checked && estimatedCost(item) !== null,
  ).length;
  const catalogItems = items.filter(
    (item) => !item.checked && item.catalogStore === store && item.catalogPrice !== undefined,
  );
  const catalogTotal = catalogItems.reduce((sum, item) => sum + (item.catalogPrice ?? 0), 0);
  const filteredItems = items.filter((item) => {
    const matchesQuery = item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
    const matchesFilter = filter === "all" || (filter === "open" ? !item.checked : item.checked);
    return matchesQuery && matchesFilter;
  });
  const groupedItems = AISLES.map((aisle) => ({
    aisle,
    items: filteredItems.filter((item) => item.aisle === aisle),
  })).filter((group) => group.items.length > 0);
  const canSearchCatalog = store === "carrefour";
  const retailerUrl = STORE_URLS[store];

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

  async function toggle(item: ShoppingItem) {
    setError("");
    setBusyItem(item._id);
    try {
      const response = await fetch(`/api/shopping-items/${item._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checked: !item.checked }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.update"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setBusyItem("");
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
    try {
      const response = await fetch("/api/shopping-lists/generate", { method: "POST" });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(result?.error ?? t("errors.generate"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("errors.network"));
    } finally {
      setGenerating(false);
    }
  }

  async function searchCatalog() {
    setCatalogPending(true);
    setCatalogNotice("");
    setCatalogWarning("");
    setCatalogCheckedAt("");
    setError("");
    try {
      const response = await fetch("/api/shopping-price-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items
            .filter((item) => !item.checked)
            .slice(0, 12)
            .map(({ _id, name }) => ({ id: _id, name })),
        }),
      });
      const result = (await response.json().catch(() => null)) as {
        error?: string;
        unavailableCount?: number;
        checkedAt?: string;
        results?: CatalogMatch[];
      } | null;
      if (!response.ok || !result?.results) {
        setError(result?.error ?? t("errors.catalog"));
        return;
      }
      setCatalogMatches(
        result.results.filter((match): match is NonNullable<CatalogMatch> => match !== null),
      );
      setCatalogNotice(t("catalog.completed"));
      setCatalogWarning(
        result.unavailableCount ? t("catalog.partial", { count: result.unavailableCount }) : "",
      );
      setCatalogCheckedAt(result.checkedAt ?? "");
      router.refresh();
    } catch {
      setError(t("errors.network"));
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
              {estimatedCount > 0 ? `${total.toFixed(2)} DT` : t("estimate.noPrice")}
            </p>
          </span>
        </summary>
        <Card className="border-0 pt-0 shadow-none">
          <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t("estimate.storeLabel")}
              <select
                value={store}
                onChange={(event) => {
                  setStore(event.target.value as StoreId);
                  setCatalogMatches([]);
                  setCatalogNotice("");
                  setCatalogWarning("");
                  setCatalogCheckedAt("");
                }}
                className="h-12 rounded-input border border-border bg-background px-3 font-medium outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                {STORES.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </label>
            {canSearchCatalog ? (
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
            ) : retailerUrl ? (
              <a
                href={retailerUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-input border border-border bg-background px-4 text-sm font-semibold text-primary hover:bg-tint"
              >
                {t("catalog.openStore")} <ArrowUpRight aria-hidden className="size-4" />
              </a>
            ) : (
              <span className="text-sm text-muted">{t("catalog.noLink")}</span>
            )}
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
              {!canSearchCatalog && ` ${t("catalog.unsupportedStore")}`}
            </p>
          </div>

          {canSearchCatalog && (
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs leading-relaxed text-muted">
              <input
                type="checkbox"
                checked={catalogConsent}
                onChange={(event) => setCatalogConsent(event.target.checked)}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>{t("catalog.consent")}</span>
            </label>
          )}

          {catalogNotice && (
            <p role="status" className="mt-3 text-sm font-medium text-success">
              {catalogNotice}
            </p>
          )}
          {canSearchCatalog && items.filter((item) => !item.checked).length > 12 && (
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
          {canSearchCatalog && catalogCheckedAt && (
            <p className="mt-2 text-xs text-muted">
              {t("catalog.checkedAt", { date: new Date(catalogCheckedAt).toLocaleString() })}
            </p>
          )}
          {canSearchCatalog && catalogItems.length > 0 && (
            <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
              <p className="text-sm font-semibold text-primary">
                {t("catalog.matchingPrices", { count: catalogItems.length })}
              </p>
              <p className="mt-1 text-lg font-black text-primary">{catalogTotal.toFixed(2)} DT</p>
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
                      {match.product.price.toFixed(2)} DT
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {canSearchCatalog && catalogMatches.length > 0 && (
            <p className="mt-2 text-xs text-muted">{t("catalog.packPriceNote")}</p>
          )}
        </Card>
      </details>

      <Card className="border border-border/70 bg-gradient-to-br from-tint/80 to-surface p-4 shadow-sm sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">{t("progress.title")}</h2>
            <p className="mt-1 text-sm text-muted">
              {items.length > 0
                ? t("progress.items", { checked: checkedCount, total: items.length })
                : t("empty.title")}
            </p>
          </div>
          <span className="text-xl font-black text-primary">{progress}%</span>
        </div>
        <div
          role="progressbar"
          aria-label={t("progress.title")}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-3 h-2.5 overflow-hidden rounded-full bg-background"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          {openCount === 0 && items.length > 0
            ? t("progress.complete")
            : t("progress.remaining", { count: openCount })}
        </p>
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
                item.catalogStore === store && item.catalogPrice !== undefined
                  ? item.catalogPrice
                  : estimatedCost(item);
              const hasCatalogPrice =
                item.catalogStore === store && item.catalogPrice !== undefined;
              const itemBusy = busyItem === item._id;
              return (
                <li key={item._id}>
                  <Card
                    className={`flex min-h-20 items-center gap-3 border border-border/70 p-3 shadow-sm transition-colors hover:border-primary/30 ${
                      item.checked ? "bg-background/70 opacity-75" : ""
                    }`}
                  >
                    <button
                      type="button"
                      aria-label={`${item.checked ? t("filters.open") : t("filters.checked")}: ${item.name}`}
                      aria-pressed={item.checked}
                      disabled={itemBusy}
                      onClick={() => void toggle(item)}
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
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
                      <p
                        className={`truncate font-semibold ${item.checked ? "text-muted line-through" : ""}`}
                      >
                        {item.name}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {price === null
                          ? t("estimate.noPrice")
                          : `${price.toFixed(2)} DT${hasCatalogPrice ? ` · ${t("catalog.productPrice")}` : ""}`}
                      </p>
                      {hasCatalogPrice && item.catalogSearchUrl && (
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
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label={`${t("itemActions.decrease")} ${item.name}`}
                        disabled={itemBusy || item.checked || (item.quantity ?? 1) <= 0}
                        onClick={() => void changeQuantity(item, -1)}
                        className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-primary disabled:opacity-40"
                      >
                        <Minus aria-hidden className="size-4" />
                      </button>
                      <span className="min-w-12 text-center text-xs font-semibold">
                        {item.quantity ?? 1} {t(`units.${item.unit}`)}
                      </span>
                      <button
                        type="button"
                        aria-label={`${t("itemActions.increase")} ${item.name}`}
                        disabled={itemBusy || item.checked}
                        onClick={() => void changeQuantity(item, 1)}
                        className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-tint hover:text-primary disabled:opacity-40"
                      >
                        <Plus aria-hidden className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`${t("itemActions.remove")} ${item.name}`}
                        disabled={itemBusy}
                        onClick={() => void removeItem(item)}
                        className="ml-1 flex size-8 items-center justify-center rounded-full text-muted hover:bg-warning-bg hover:text-danger disabled:opacity-40"
                      >
                        <Trash2 aria-hidden className="size-4" />
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <Button
        type="button"
        variant="secondary"
        fullWidth
        disabled={generating}
        onClick={() => void generate()}
      >
        {generating ? t("generating") : t("generate")}
      </Button>

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
      {error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
