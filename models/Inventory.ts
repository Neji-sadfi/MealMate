// Owner: Member 4 (shopping + inventory)
// One document per ingredient the user has in stock.
import { Schema, model, models, type Model, type Types } from "mongoose";
import { UNITS, type Unit } from "./enums";

export interface IInventory {
  user: Types.ObjectId;
  ingredient: Types.ObjectId;
  quantity: number;
  unit: Unit;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const inventorySchema = new Schema<IInventory>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient", required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: UNITS, required: true },
    expiresAt: Date,
  },
  { timestamps: true },
);

inventorySchema.index({ user: 1, expiresAt: 1 });
inventorySchema.index({ user: 1, ingredient: 1 });

export const Inventory: Model<IInventory> =
  (models.Inventory as Model<IInventory>) ?? model<IInventory>("Inventory", inventorySchema);
