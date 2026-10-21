import type { QueryFilter } from "mongoose";
import { DIETS, DIFFICULTIES } from "@/models/enums";
import type { IRecipe } from "@/models/Recipe";

function numberParameter(params: URLSearchParams, key: string) {
  const value = params.get(key);
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function buildRecipeFilter(params: URLSearchParams): QueryFilter<IRecipe> {
  const filter: QueryFilter<IRecipe> = {};
  const search = params.get("search")?.trim().slice(0, 100);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { tags: { $regex: escaped, $options: "i" } },
    ];
  }

  const diet = params.get("diet");
  if (diet && DIETS.includes(diet as (typeof DIETS)[number])) {
    filter.diets = diet as (typeof DIETS)[number];
  }
  const difficulty = params.get("difficulty");
  if (difficulty && DIFFICULTIES.includes(difficulty as (typeof DIFFICULTIES)[number])) {
    filter.difficulty = difficulty as (typeof DIFFICULTIES)[number];
  }
  const maxCalories = numberParameter(params, "maxCalories");
  const minProtein = numberParameter(params, "minProtein");
  const maxCost = numberParameter(params, "maxCost");
  const maxTime = numberParameter(params, "maxTime");
  if (maxCalories !== undefined) filter["nutrition.calories"] = { $lte: maxCalories };
  if (minProtein !== undefined) filter["nutrition.protein"] = { $gte: minProtein };
  if (maxCost !== undefined) filter.costPerServing = { $lte: maxCost };
  if (maxTime !== undefined) filter.prepTimeMinutes = { $lte: maxTime };
  return filter;
}
