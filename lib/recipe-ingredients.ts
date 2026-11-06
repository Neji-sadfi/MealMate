import { escapeRegex } from "@/lib/regex";
import { Ingredient } from "@/models/Ingredient";
import type { RecipeInput } from "@/features/recipes/schemas";

export async function resolveRecipeIngredients(ingredients: RecipeInput["ingredients"]) {
  // One after the other: the same new name twice in a recipe must not race on the unique index.
  const resolved = [];
  for (const item of ingredients) {
    const ingredient = await Ingredient.findOneAndUpdate(
      { name: { $regex: `^${escapeRegex(item.name)}$`, $options: "i" } },
      { $setOnInsert: { name: item.name, defaultUnit: item.unit } },
      { upsert: true, returnDocument: "after" },
    );
    resolved.push({ ...item, ingredient: ingredient._id });
  }
  return resolved;
}
