// Owner: Member 5 (community)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { MODERATION_STATUSES, type ModerationStatus } from "./enums";

export interface IForumComment {
  post: Types.ObjectId;
  author: Types.ObjectId;
  content: string;
  status: ModerationStatus;
  createdAt: Date;
  updatedAt: Date;
}

const forumCommentSchema = new Schema<IForumComment>(
  {
    post: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 2000 },
    status: { type: String, enum: MODERATION_STATUSES, default: "visible" },
  },
  { timestamps: true },
);

forumCommentSchema.index({ post: 1, createdAt: 1 });

export const ForumComment: Model<IForumComment> =
  (models.ForumComment as Model<IForumComment>) ??
  model<IForumComment>("ForumComment", forumCommentSchema);
