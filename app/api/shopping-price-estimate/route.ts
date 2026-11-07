import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

export const runtime = "nodejs";
export const maxDuration = 15;

const requestSchema = z.object({
  items: z.array(z.string().refine(Types.ObjectId.isValid)).min(1).max(12),
});

const GEANT_CATALOG_URL = "https://www.geantdrive.tn/tunis-city/";
const PRODUCT_CARD_PATTERN =
  /<article\b(?=[^>]*\bproduct-miniature\b)[^>]*>([\s\S]*?)<\/article>/gi;
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 2;
const PAGE_CACHE_TTL_MS = 5 * 60_000;
const hits = new Map<string, number[]>();
const pageCache = new Map<string, { expiresAt: number; html: string }>();
const pendingPages = new Map<string, Promise<string>>();

const frenchSearchTerms: Record<string, string> = {
  almonds: "amandes",
  basil: "basilic",
  banana: "banane",
  "chicken breast": "blanc de poulet",
  chickpeas: "pois chiches",
  courgette: "courgette",
  eggs: "oeufs",
  lemon: "citron",
  milk: "lait",
  "olive oil": "huile d'olive",
  pasta: "pates",
  parsley: "persil",
  rice: "riz",
  "rolled oats": "flocons d'avoine",
  tomatoes: "tomate",
};

type CatalogProduct = {
  name: string;
  price: number;
  priceLabel: string;
  currency: "TND";
  searchUrl: string;
};

function getErrorDetails(error: unknown) {
  if (!(error instanceof Error)) return { name: "UnknownError" };

  const cause = error.cause;
  const causeDetails =
    cause instanceof Error
      ? {
          name: cause.name,
          message: cause.message,
          code:
            "code" in cause && typeof cause.code === "string" ? cause.code : undefined,
        }
      : undefined;

  return { name: error.name, message: error.message, cause: causeDetails };
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((hit) => now - hit < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(userId, recent);
    return true;
  }
  hits.set(userId, [...recent, now]);
  return false;
}

function decodeHtmlEntities(value: string): string {
  const namedEntities: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[\da-f]+|#\d+|amp|apos|gt|lt|nbsp|quot);/gi, (entity, code: string) => {
    if (code[0] !== "#") return namedEntities[code.toLowerCase()] ?? entity;
    const isHex = code[1]?.toLowerCase() === "x";
    const characterCode = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isFinite(characterCode) && characterCode <= 0x10ffff
      ? String.fromCodePoint(characterCode)
      : entity;
  });
}

function stripHtml(value: string): string {
  return decodeHtmlEntities(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function parseCatalogPrice(value: string): number | null {
  const amount = stripHtml(value).match(/\d[\d.,]*/)?.[0];
  if (!amount) return null;
  const price = Number(amount.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(price) && price >= 0 ? price : null;
}

function parseProductPrice(html: string): number | null {
  const priceTag = html.match(/<span\b[^>]*\bitemprop=["']price["'][^>]*>([\s\S]*?)<\/span>/i);
  if (!priceTag) return null;

  const content = priceTag[0].match(/\bcontent=["']([^"']+)["']/i)?.[1];
  if (content !== undefined) {
    const price = Number(content);
    if (Number.isFinite(price) && price >= 0) return price;
  }

  return parseCatalogPrice(priceTag[1]);
}

function parseProductPriceLabel(html: string): string | null {
  const priceTag = html.match(/<span\b[^>]*\bitemprop=["']price["'][^>]*>([\s\S]*?)<\/span>/i);
  if (!priceTag) return null;
  const label = stripHtml(priceTag[1]);
  return label || null;
}

async function fetchStorePage(url: string): Promise<string> {
  const cached = pageCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.html;

  const pending = pendingPages.get(url);
  if (pending) return pending;

  const request = fetch(url, {
    headers: { Accept: "text/html" },
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Géant Drive returned ${response.status}`);
    const html = await response.text();
    pageCache.set(url, { expiresAt: Date.now() + PAGE_CACHE_TTL_MS, html });
    if (pageCache.size > 30) {
      const oldest = pageCache.keys().next().value;
      if (oldest) pageCache.delete(oldest);
    }
    return html;
  });
  pendingPages.set(url, request);
  try {
    return await request;
  } finally {
    pendingPages.delete(url);
  }
}

function parseStoreProducts(html: string, pageUrl: string): CatalogProduct[] {
  const products: CatalogProduct[] = [];

  for (const [, cardHtml] of html.matchAll(PRODUCT_CARD_PATTERN)) {
    const title = cardHtml.match(/<h[1-6]\b[^>]*\bproduct-title\b[^>]*>([\s\S]*?)<\/h[1-6]>/i)?.[1];
    const name = title
      ? decodeHtmlEntities(
          title.match(/\btitle=["']([^"']+)["']/i)?.[1] ??
            stripHtml(title.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i)?.[1] ?? title),
        )
      : "";
    const href = title?.match(/<a\b[^>]*\bhref=["']([^"']+)["']/i)?.[1];
    const price = parseProductPrice(cardHtml);
    const priceLabel = parseProductPriceLabel(cardHtml);
    if (!name || !href || price === null || !priceLabel) continue;

    let productUrl: URL;
    try {
      productUrl = new URL(decodeHtmlEntities(href), pageUrl);
    } catch {
      continue;
    }
    if (
      productUrl.protocol !== "https:" ||
      productUrl.hostname !== "www.geantdrive.tn" ||
      !productUrl.pathname.startsWith("/tunis-city/")
    ) {
      continue;
    }

    products.push({
      name,
      price,
      priceLabel,
      currency: "TND",
      searchUrl: productUrl.toString(),
    });
  }

  return products;
}

function normalizeTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(
      (token) =>
        Boolean(token) && !["d", "de", "des", "du", "et", "la", "le", "les"].includes(token),
    )
    .map((token) => (token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token));
}

function storeSearchUrl(itemName: string): string {
  const key = itemName.trim().toLowerCase();
  const searchTerm = frenchSearchTerms[key] ?? itemName;
  const url = new URL("recherche", GEANT_CATALOG_URL);
  url.searchParams.set("controller", "search");
  url.searchParams.set("orderby", "price");
  url.searchParams.set("orderway", "asc");
  url.searchParams.set("s", searchTerm);
  return url.toString();
}

function bestProduct(products: CatalogProduct[], itemName: string): CatalogProduct | null {
  const searchTerm = frenchSearchTerms[itemName.trim().toLowerCase()] ?? itemName;
  const searchTokens = new Set(normalizeTokens(searchTerm));
  const normalizedSearch = normalizeTokens(searchTerm).join(" ");
  if (searchTokens.size === 0) return null;

  const ranked = products
    .map((product) => {
      const normalizedName = normalizeTokens(product.name).join(" ");
      const productTokens = new Set(normalizedName.split(" "));
      const overlap = [...searchTokens].filter((token) => productTokens.has(token)).length;
      return {
        product,
        score: overlap / searchTokens.size,
        startsWithSearch: normalizedName.startsWith(normalizedSearch),
        containsSearch: normalizedName.includes(normalizedSearch),
      };
    })
    .filter(({ score }) => score >= 0.6)
    .sort(
      (left, right) =>
        Number(right.startsWithSearch) - Number(left.startsWithSearch) ||
        Number(right.containsSearch) - Number(left.containsSearch) ||
        right.score - left.score,
    );

  return ranked[0]?.product ?? null;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(userId.toString())) {
    return NextResponse.json(
      { error: "Too many catalogue checks. Try again shortly." },
      { status: 429 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid catalogue check." }, { status: 400 });

  const listIds = await ShoppingList.find({ user: userId }).distinct("_id");
  const shoppingItems = await ShoppingItem.find({
    _id: { $in: parsed.data.items },
    list: { $in: listIds },
    checked: false,
  })
    .select("_id name")
    .lean();
  if (shoppingItems.length !== parsed.data.items.length) {
    return NextResponse.json({ error: "Some shopping items are unavailable." }, { status: 400 });
  }

  const lookups = await Promise.allSettled(
    shoppingItems.map(async (item) => {
      const searchUrl = storeSearchUrl(item.name);
      const html = await fetchStorePage(searchUrl);
      return {
        itemId: item._id.toString(),
        product: bestProduct(parseStoreProducts(html, searchUrl), item.name),
      };
    }),
  );
  const matchedProducts = new Map<string, CatalogProduct | null>();
  let successfulLookups = 0;
  for (const result of lookups) {
    if (result.status === "rejected") {
      console.error("Géant Drive product search failed", {
        ...getErrorDetails(result.reason),
      });
      continue;
    }
    successfulLookups += 1;
    matchedProducts.set(result.value.itemId, result.value.product);
  }
  if (successfulLookups === 0) {
    return NextResponse.json(
      { error: "The Géant Drive Tunis City search is temporarily unavailable." },
      { status: 502 },
    );
  }

  const checkedAt = new Date();
  const results = await Promise.all(
    shoppingItems.map(async (item) => {
      const product = matchedProducts.get(item._id.toString()) ?? null;
      await ShoppingItem.updateOne(
        { _id: item._id, checked: false },
        product
          ? {
              $set: {
                catalogPrice: product.price,
                catalogPriceLabel: product.priceLabel,
                catalogProductName: product.name,
                catalogSearchUrl: product.searchUrl,
                catalogStore: "geant",
                catalogCheckedAt: checkedAt,
              },
            }
          : {
              $unset: {
                catalogPrice: 1,
                catalogPriceLabel: 1,
                catalogProductName: 1,
                catalogSearchUrl: 1,
                catalogStore: 1,
                catalogCheckedAt: 1,
              },
            },
      );
      return {
        itemId: item._id.toString(),
        itemName: item.name,
        product,
      };
    }),
  );

  return NextResponse.json(
    {
      source: "Géant Drive Tunis City product search",
      checkedAt: checkedAt.toISOString(),
      unmatchedCount: results.filter((result) => result.product === null).length,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
