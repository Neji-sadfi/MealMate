// Owner: Member 4 (shopping + inventory)
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IShoppingList {
  user: Types.ObjectId;
  mealPlan?: Types.ObjectId;
  weekStart: Date;
  budget?: number;
  estimatedTotal: number;
  completed: boolean;
  lastSyncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const shoppingListSchema = new Schema<IShoppingList>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    mealPlan: { type: Schema.Types.ObjectId, ref: "MealPlan" },
    weekStart: { type: Date, required: true },
    budget: { type: Number, min: 0 },
    estimatedTotal: { type: Number, default: 0, min: 0 },
    completed: { type: Boolean, default: false },
    lastSyncedAt: Date,
  },
  { timestamps: true },
);

shoppingListSchema.index({ user: 1, weekStart: -1 });

export const ShoppingList: Model<IShoppingList> =
  (models.ShoppingList as Model<IShoppingList>) ??
  model<IShoppingList>("ShoppingList", shoppingListSchema);
