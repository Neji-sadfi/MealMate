// Owner: Member 2 (recipes). Shared with Members 3 and 4: change only through a reviewed PR.
import { Schema, model, models, type Model } from "mongoose";
import { AISLES, UNITS, type Aisle, type Unit } from "./enums";

export interface INutritionPer100 {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IIngredient {
  name: string;
  aisle: Aisle;
  defaultUnit: Unit;
  /** Indicative TND price per kg, litre or item, depending on the ingredient. */
  estimatedPrice?: number;
  nutritionPer100?: INutritionPer100;
  createdAt: Date;
  updatedAt: Date;
}

const ingredientSchema = new Schema<IIngredient>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    aisle: { type: String, enum: AISLES, default: "other", index: true },
    defaultUnit: { type: String, enum: UNITS, default: "g" },
    estimatedPrice: { type: Number, min: 0 },
    nutritionPer100: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
    },
  },
  { timestamps: true },
);

export const Ingredient: Model<IIngredient> =
  (models.Ingredient as Model<IIngredient>) ?? model<IIngredient>("Ingredient", ingredientSchema);
