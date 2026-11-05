import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentUserId } from "@/lib/current-user";
import {
  InventoryActions,
  type InventoryItemView,
} from "@/features/shopping/components/InventoryActions";
import { Inventory } from "@/models/Inventory";
import { PhotoHero } from "@/components/ui/PhotoHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inventory");
  return { title: t("title") };
}

export default async function InventoryPage() {
  const t = await getTranslations("pages.inventory");
  const userId = await getCurrentUserId();
  const rows = userId
    ? await Inventory.find({ user: userId })
        .populate("ingredient", "name aisle")
        .sort({ expiresAt: 1 })
        .lean()
    : [];
  const items: InventoryItemView[] = rows.flatMap((item) => {
    const ingredient = item.ingredient as unknown as { name: string; aisle: string } | null;
    if (!ingredient) return [];
    return [
      {
        id: item._id.toString(),
        name: ingredient.name,
        aisle: ingredient.aisle,
        quantity: item.quantity,
        unit: item.unit,
        expiresAt: item.expiresAt?.toISOString(),
      },
    ];
  });

  return (
    <div className="flex flex-col gap-4">
      <PhotoHero image="inventory" title={t("title")} subtitle={t("subtitle")} />
      <InventoryActions key={JSON.stringify(items)} initialItems={items} />
    </div>
  );
}
