// Owner: Member 5 (community)
import { Schema, model, models, type Model, type Types } from "mongoose";

export interface IForumLike {
  post: Types.ObjectId;
  user: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const forumLikeSchema = new Schema<IForumLike>(
  {
    post: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

// One like per user per post.
forumLikeSchema.index({ post: 1, user: 1 }, { unique: true });

export const ForumLike: Model<IForumLike> =
  (models.ForumLike as Model<IForumLike>) ?? model<IForumLike>("ForumLike", forumLikeSchema);
