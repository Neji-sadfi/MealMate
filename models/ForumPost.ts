// Owner: Member 5 (community)
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  FORUM_CATEGORIES,
  MODERATION_STATUSES,
  type ForumCategory,
  type ModerationStatus,
} from "./enums";

export interface IForumPost {
  author: Types.ObjectId;
  category: ForumCategory;
  title: string;
  content: string;
  /** Counters kept in sync by the API to avoid counting on every list. */
  likesCount: number;
  commentsCount: number;
  reportsCount: number;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const forumPostSchema = new Schema<IForumPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, enum: FORUM_CATEGORIES, required: true },
    title: { type: String, required: true, trim: true, maxlength: 140 },
    content: { type: String, required: true, maxlength: 5000 },
    likesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    reportsCount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: MODERATION_STATUSES, default: "visible" },
  },
  { timestamps: true },
);

forumPostSchema.index({ status: 1, category: 1, createdAt: -1 });
forumPostSchema.index({ author: 1, createdAt: -1 });

export const ForumPost: Model<IForumPost> =
  (models.ForumPost as Model<IForumPost>) ?? model<IForumPost>("ForumPost", forumPostSchema);
