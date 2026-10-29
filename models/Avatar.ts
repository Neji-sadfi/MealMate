// Owner: Member 1 (auth + profile)
import { Schema, Types, model, models, type Model } from "mongoose";

/**
 * Profile photo, kept apart from User so user queries stay light.
 * The browser resizes the photo to a small square JPEG before upload (~20-50 KB),
 * so storing it directly in MongoDB is fine and needs no external file service.
 */
export interface IAvatar {
  userId: Types.ObjectId;
  data: Buffer;
  contentType: string;
  updatedAt: Date;
}

const avatarSchema = new Schema<IAvatar>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    data: { type: Buffer, required: true },
    contentType: { type: String, required: true },
  },
  { timestamps: { createdAt: false, updatedAt: true } },
);

export const Avatar: Model<IAvatar> =
  (models.Avatar as Model<IAvatar>) ?? model<IAvatar>("Avatar", avatarSchema);
