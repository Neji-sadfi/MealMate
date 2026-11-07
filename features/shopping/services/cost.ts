import type { Unit } from "@/models/enums";

type CostItem = { estimatedPrice?: number; quantity?: number; unit: Unit };

/** Estimated cost of a shopping line: prices are per kg, per litre or per piece. */
export function estimatedItemCost(item: CostItem): number | null {
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
