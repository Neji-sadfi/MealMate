// Owner: Member 2 (recipes)
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IFavorite {
  user: Types.ObjectId;
  recipe: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipe: { type: Schema.Types.ObjectId, ref: "Recipe", required: true },
  },
  { timestamps: true },
);

favoriteSchema.index({ user: 1, recipe: 1 }, { unique: true });

export const Favorite: Model<IFavorite> =
  (models.Favorite as Model<IFavorite>) ?? model<IFavorite>("Favorite", favoriteSchema);
