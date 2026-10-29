import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ShoppingActions } from "@/features/shopping/components/ShoppingActions";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";
import { PhotoHero } from "@/components/ui/PhotoHero";
import { Ingredient } from "@/models/Ingredient";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.shopping");
  return { title: t("title") };
}

export default async function ShoppingPage() {
  const t = await getTranslations("pages.shopping");
  const userId = await getCurrentUserId();
  const list = userId
    ? await ShoppingList.findOne({ user: userId, weekStart: currentWeekStart() }).lean()
    : null;
  const items = list
    ? await ShoppingItem.find({ list: list._id })
        .populate<{ ingredient: { estimatedPrice?: number } | null }>(
          "ingredient",
          "estimatedPrice",
        )
        .sort({ aisle: 1, createdAt: 1 })
        .lean()
    : [];
  const unlinkedIngredients =
    items.length > 0
      ? await Ingredient.find({ name: { $in: items.map((item) => item.name) } })
          .select("name estimatedPrice")
          .lean()
      : [];
  const priceByName = new Map(
    unlinkedIngredients.map((ingredient) => [
      ingredient.name.trim().toLocaleLowerCase(),
      ingredient.estimatedPrice,
    ]),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <PhotoHero image="shopping" title={t("title")} subtitle={t("subtitle")} />
        <Link
          href="/shopping/inventory"
          className="absolute right-4 bottom-4 sm:right-6 sm:bottom-6"
        >
          <Button variant="secondary" className="h-10 rounded-xl bg-white/95">
            {t("inventoryLink")}
          </Button>
        </Link>
      </div>
      {items.length === 0 && (
        <Card>
          <h2 className="font-bold">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </Card>
      )}
      <ShoppingActions
        items={items.map((item) => ({
          _id: item._id.toString(),
          name: item.name,
          aisle: item.aisle ?? "other",
          quantity: item.quantity,
          unit: item.unit,
          estimatedPrice:
            item.estimatedPrice ??
            (typeof item.ingredient === "object" && item.ingredient !== null
              ? item.ingredient.estimatedPrice
              : undefined) ??
            priceByName.get(item.name.trim().toLocaleLowerCase()),
          catalogPrice: item.catalogPrice,
          catalogProductName: item.catalogProductName,
          catalogSearchUrl: item.catalogSearchUrl,
          catalogStore: item.catalogStore,
          checked: item.checked,
        }))}
      />
    </div>
  );
}
