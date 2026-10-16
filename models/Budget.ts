// Owner: Member 4 (shopping + inventory). Read by Member 5 (tracking) and Member 3 (home).
import { Schema, model, models, type Model, type Types } from "mongoose";
import { DEFAULT_CURRENCY, EXPENSE_CATEGORIES, type ExpenseCategory } from "./enums";

export interface IExpense {
  label: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
}

export interface IBudget {
  user: Types.ObjectId;
  /** Monday of the budget week. */
  weekStart: Date;
  limit: number;
  currency: string;
  expenses: IExpense[];
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema<IExpense>(
  {
    label: { type: String, required: true, trim: true },
    category: { type: String, enum: EXPENSE_CATEGORIES, default: "other" },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
  },
  { _id: true },
);

const budgetSchema = new Schema<IBudget>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    weekStart: { type: Date, required: true },
    limit: { type: Number, required: true, min: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY },
    expenses: { type: [expenseSchema], default: [] },
  },
  { timestamps: true },
);

budgetSchema.index({ user: 1, weekStart: 1 }, { unique: true });

export const Budget: Model<IBudget> =
  (models.Budget as Model<IBudget>) ?? model<IBudget>("Budget", budgetSchema);
