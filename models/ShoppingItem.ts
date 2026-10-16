// Owner: Member 4 (shopping + inventory)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { AISLES, UNITS, type Aisle, type Unit } from "./enums";

export interface IShoppingItem {
  list: Types.ObjectId;
  /** Empty for items added manually without a catalogue ingredient. */
  ingredient?: Types.ObjectId;
  name: string;
  quantity?: number;
  unit: Unit;
  aisle: Aisle;
  estimatedPrice?: number;
  checked: boolean;
  addedManually: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shoppingItemSchema = new Schema<IShoppingItem>(
  {
    list: { type: Schema.Types.ObjectId, ref: "ShoppingList", required: true },
    ingredient: { type: Schema.Types.ObjectId, ref: "Ingredient" },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 0 },
    unit: { type: String, enum: UNITS, default: "piece" },
    aisle: { type: String, enum: AISLES, default: "other" },
    estimatedPrice: { type: Number, min: 0 },
    checked: { type: Boolean, default: false },
    addedManually: { type: Boolean, default: false },
  },
  { timestamps: true },
);

shoppingItemSchema.index({ list: 1, aisle: 1 });

export const ShoppingItem: Model<IShoppingItem> =
  (models.ShoppingItem as Model<IShoppingItem>) ??
  model<IShoppingItem>("ShoppingItem", shoppingItemSchema);
