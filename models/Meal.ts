// Owner: Member 3 (meal planning)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { MEAL_TYPES, type MealType } from "./enums";

export interface IMeal {
  mealPlan: Types.ObjectId;
  user: Types.ObjectId;
  recipe: Types.ObjectId;
  date: Date;
  type: MealType;
  /** Planned time, "HH:mm". */
  time?: string;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
}

const mealSchema = new Schema<IMeal>(
  {
    mealPlan: { type: Schema.Types.ObjectId, ref: "MealPlan", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
    date: { type: Date, required: true },
    type: { type: String, enum: MEAL_TYPES, required: true },
    time: { type: String, match: /^\d{2}:\d{2}$/ },
    servings: { type: Number, default: 1, min: 1 },
  },
  { timestamps: true },
);

mealSchema.index({ mealPlan: 1, date: 1 });
mealSchema.index({ user: 1, date: 1 });

export const Meal: Model<IMeal> = (models.Meal as Model<IMeal>) ?? model<IMeal>("Meal", mealSchema);
