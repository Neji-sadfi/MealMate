// Owner: Member 2 (recipes)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { DIETS, DIFFICULTIES, UNITS, type Diet, type Difficulty, type Unit } from "./enums";

export interface IRecipeIngredient {
  ingredient: Types.ObjectId;
  /** Denormalised name so lists render without a populate. */
  name: string;
  quantity?: number;
  unit: Unit;
  note?: string;
}

export interface IRecipeStep {
  order: number;
  title: string;
  description: string;
}

export interface IRecipeNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface IRecipe {
  title: string;
  tagline?: string;
  description?: string;
  imageUrl?: string;
  diets: Diet[];
  tags: string[];
  difficulty: Difficulty;
  prepTimeMinutes: number;
  servings: number;
  costPerServing: number;
  /** Per serving. */
  nutrition: IRecipeNutrition;
  ingredients: IRecipeIngredient[];
  steps: IRecipeStep[];
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const recipeIngredientSchema = new Schema<IRecipeIngredient>(
  {
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    name: { type: String, required: true },
    quantity: { type: Number, min: 0 },
    unit: { type: String, enum: UNITS, required: true },
    note: String,
  },
  { _id: false },
);

const recipeStepSchema = new Schema<IRecipeStep>(
  {
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
  },
  { _id: false },
);

const recipeSchema = new Schema<IRecipe>(
  {
    title: { type: String, required: true, trim: true },
    tagline: String,
    description: String,
    imageUrl: String,
    diets: { type: [String], enum: DIETS, default: [] },
    tags: { type: [String], default: [] },
    difficulty: { type: String, enum: DIFFICULTIES, default: "easy" },
    prepTimeMinutes: { type: Number, required: true, min: 0 },
    servings: { type: Number, default: 1, min: 1 },
    costPerServing: { type: Number, required: true, min: 0 },
    nutrition: {
      calories: { type: Number, required: true },
      protein: { type: Number, required: true },
      carbs: { type: Number, required: true },
      fat: { type: Number, required: true },
    },
    ingredients: { type: [recipeIngredientSchema], default: [] },
    steps: { type: [recipeStepSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

recipeSchema.index({ title: "text", tags: "text" });
recipeSchema.index({ diets: 1, costPerServing: 1 });

export const Recipe: Model<IRecipe> =
  (models.Recipe as Model<IRecipe>) ?? model<IRecipe>("Recipe", recipeSchema);
