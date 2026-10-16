// Owner: Member 3 (meal planning)
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IMealPlan {
  user: Types.ObjectId;
  /** Monday of the planned week (00:00 UTC). */
  weekStart: Date;
  weekEnd: Date;
  people: number;
  budget?: number;
  /** True when created by the rule-based generator. */
  generated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const mealPlanSchema = new Schema<IMealPlan>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    weekEnd: { type: Date, required: true },
    people: { type: Number, default: 1, min: 1 },
    budget: { type: Number, min: 0 },
    generated: { type: Boolean, default: false },
  },
  { timestamps: true },
);

mealPlanSchema.index({ user: 1, weekStart: 1 }, { unique: true });

export const MealPlan: Model<IMealPlan> =
  (models.MealPlan as Model<IMealPlan>) ?? model<IMealPlan>("MealPlan", mealPlanSchema);
