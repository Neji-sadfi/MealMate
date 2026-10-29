// Owner: Member 5 (community)
import { Schema, model, models, type Model, type Types } from "mongoose";

export const FORUM_REACTIONS = ["like", "helpful", "inspiring"] as const;
export type ForumReactionType = (typeof FORUM_REACTIONS)[number];

export interface IForumLike {
  post: Types.ObjectId;
  user: Types.ObjectId;
  reaction: ForumReactionType;
  createdAt: Date;
  updatedAt: Date;
}

const forumLikeSchema = new Schema<IForumLike>(
  {
    post: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reaction: { type: String, enum: FORUM_REACTIONS, default: "like" },
  },
  { timestamps: true },
);

// One like per user per post.
forumLikeSchema.index({ post: 1, user: 1 }, { unique: true });

export const ForumLike: Model<IForumLike> =
  (models.ForumLike as Model<IForumLike>) ?? model<IForumLike>("ForumLike", forumLikeSchema);
