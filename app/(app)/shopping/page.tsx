import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ShoppingActions } from "@/features/shopping/components/ShoppingActions";
import { getCurrentUserId } from "@/lib/current-user";
import { ShoppingItem } from "@/models/ShoppingItem";
import { ShoppingList } from "@/models/ShoppingList";

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
    ? await ShoppingItem.find({ list: list._id }).sort({ aisle: 1, createdAt: 1 }).lean()
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black">{t("title")}</h1><p className="text-sm text-muted">{t("subtitle")}</p></div>
        <Link href="/shopping/inventory"><Button variant="secondary" className="h-10 rounded-xl">Inventory</Button></Link>
      </div>
      {items.length === 0 && <Card><h2 className="font-bold">Your list is empty</h2><p className="mt-1 text-sm text-muted">Items you add will be saved to your MongoDB account.</p></Card>}
      <ShoppingActions items={items.map((item) => ({
        _id: item._id.toString(),
        name: item.name,
        quantity: item.quantity,
        checked: item.checked,
      }))} />
    </div>
  );
}
