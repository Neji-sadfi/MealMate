import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

export const runtime = "nodejs";
export const maxDuration = 15;

const requestSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string().refine(Types.ObjectId.isValid),
        name: z.string().trim().min(1).max(120),
      }),
    )
    .min(1)
    .max(12),
});

const GRAPHQL_QUERY =
  "query ProductSearch($search:String!){products(search:$search){items{name url_key price_range{minimum_price{final_price{value currency}}}}}}";
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 2;
const hits = new Map<string, number[]>();

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
  name?: string;
  url_key?: string;
  price_range?: {
    minimum_price?: {
      final_price?: { value?: number; currency?: string };
    };
  };
};

type CatalogResponse = {
  data?: { products?: { items?: CatalogProduct[] } };
  errors?: { message?: string }[];
};

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

function normalizeTokens(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.length > 4 && token.endsWith("s") ? token.slice(0, -1) : token));
}

function bestProduct(products: CatalogProduct[], searchTerm: string) {
  const searchTokens = new Set(normalizeTokens(searchTerm));
  let best: { product: CatalogProduct; score: number } | undefined;

  for (const product of products) {
    const productTokens = new Set(normalizeTokens(product.name ?? ""));
    const overlap = [...searchTokens].filter((token) => productTokens.has(token)).length;
    const score = searchTokens.size === 0 ? 0 : overlap / searchTokens.size;
    if (!best || score > best.score) best = { product, score };
  }

  if (!best || best.score < 0.6) return null;
  const price = best.product.price_range?.minimum_price?.final_price;
  if (typeof price?.value !== "number" || price.currency !== "TND" || !best.product.name)
    return null;
  return {
    name: best.product.name,
    price: price.value,
    currency: price.currency,
    searchUrl: best.product.url_key
      ? `https://www.carrefour.tn/${encodeURIComponent(best.product.url_key)}.html`
      : `https://www.carrefour.tn/search?query=${encodeURIComponent(searchTerm)}`,
  };
}

async function searchCarrefour(name: string) {
  const searchTerm = frenchSearchTerms[name.trim().toLowerCase()] ?? name;
  const url = new URL("https://www.carrefour.tn/graphql");
  url.searchParams.set("query", GRAPHQL_QUERY);
  url.searchParams.set("variables", JSON.stringify({ search: searchTerm }));
  const response = await fetch(url, {
    headers: { Accept: "application/json", Store: "default" },
    signal: AbortSignal.timeout(6_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Carrefour catalogue returned ${response.status}`);
  const result = (await response.json()) as CatalogResponse;
  if (result.errors?.length) throw new Error("Carrefour catalogue query failed");
  return bestProduct(result.data?.products?.items ?? [], searchTerm);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(userId.toString())) {
    return NextResponse.json(
      { error: "Too many catalogue searches. Try again shortly." },
      { status: 429 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid catalogue search." }, { status: 400 });

  const listIds = await ShoppingList.find({ user: userId }).distinct("_id");
  const shoppingItems = await ShoppingItem.find({
    _id: { $in: parsed.data.items.map((item) => item.id) },
    list: { $in: listIds },
    checked: false,
  })
    .select("_id name")
    .lean();
  if (shoppingItems.length !== parsed.data.items.length) {
    return NextResponse.json({ error: "Some shopping items are unavailable." }, { status: 400 });
  }

  const results: ({
    itemId: string;
    itemName: string;
    product: Awaited<ReturnType<typeof searchCarrefour>>;
  } | null)[] = [];
  let failures = 0;
  const batchResults = await Promise.all(
    shoppingItems.map(async (item) => {
      let product: Awaited<ReturnType<typeof searchCarrefour>>;
      try {
        product = await searchCarrefour(item.name);
      } catch (error) {
        failures += 1;
        console.error("shopping catalogue lookup failed", error);
        return null;
      }

      const catalogCheckedAt = new Date();
      await ShoppingItem.updateOne(
        { _id: item._id, checked: false },
        product
          ? {
              $set: {
                catalogPrice: product.price,
                catalogProductName: product.name,
                catalogSearchUrl: product.searchUrl,
                catalogStore: "carrefour",
                catalogCheckedAt,
              },
            }
          : {
              $unset: {
                catalogPrice: 1,
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
  results.push(...batchResults);

  if (failures === parsed.data.items.length) {
    return NextResponse.json(
      { error: "The Carrefour catalogue is temporarily unavailable." },
      { status: 502 },
    );
  }
  return NextResponse.json(
    {
      source: "Carrefour Tunisia online catalogue",
      checkedAt: new Date().toISOString(),
      unavailableCount: failures,
      results,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
