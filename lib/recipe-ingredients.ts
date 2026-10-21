import { Ingredient } from "@/models/Ingredient";
import type { RecipeInput } from "@/features/recipes/schemas";

export async function resolveRecipeIngredients(ingredients: RecipeInput["ingredients"]) {
  return Promise.all(
    ingredients.map(async (item) => {
      const ingredient = await Ingredient.findOneAndUpdate(
        { name: item.name },
        { $setOnInsert: { name: item.name, defaultUnit: item.unit } },
        { upsert: true, returnDocument: "after" },
      );
      return { ...item, ingredient: ingredient._id };
    }),
  );
}
