import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { getCurrentUserId } from "@/lib/current-user";
import { InventoryActions } from "@/features/shopping/components/InventoryActions";
import { Inventory } from "@/models/Inventory";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.inventory");
  return { title: t("title") };
}

export default async function InventoryPage() {
  const t = await getTranslations("pages.inventory");
  const userId = await getCurrentUserId();
  const items = userId
    ? await Inventory.find({ user: userId }).populate("ingredient", "name aisle").sort({ expiresAt: 1 }).lean()
    : [];

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1"><h1 className="text-2xl font-black">{t("title")}</h1><p className="text-sm text-muted">{t("subtitle")}</p></section>
      <InventoryActions />
      {items.length === 0 ? (
        <Card><h2 className="font-bold">Your inventory is empty</h2><p className="mt-1 text-sm text-muted">Add ingredients to your inventory and they will be saved to your account.</p></Card>
      ) : items.map((item) => {
        const ingredient = item.ingredient as unknown as { name: string; aisle: string };
        return (
          <Card key={item._id.toString()} className="flex items-center justify-between">
            <div><p className="font-semibold">{ingredient.name}</p><p className="text-sm text-muted">{ingredient.aisle.replaceAll("_", " ")}</p></div>
            <span className="text-sm font-semibold text-primary">{item.quantity} {item.unit}</span>
          </Card>
        );
      })}
    </div>
  );
}
