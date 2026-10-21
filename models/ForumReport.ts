// Owner: Member 5 (community)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { REPORT_REASONS, REPORT_STATUSES, type ReportReason, type ReportStatus } from "./enums";

export interface IForumReport {
  post: Types.ObjectId;
  /** Set when a comment (not the whole post) is reported. */
  comment?: Types.ObjectId;
  reporter: Types.ObjectId;
  reason: ReportReason;
  details?: string;
  status: ReportStatus;
  /** ADMIN who handled the report. */
  reviewedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const forumReportSchema = new Schema<IForumReport>(
  {
    post: { type: Schema.Types.ObjectId, ref: "ForumPost", required: true },
    comment: { type: Schema.Types.ObjectId, ref: "ForumComment" },
    reporter: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    details: { type: String, maxlength: 1000 },
    status: { type: String, enum: REPORT_STATUSES, default: "pending" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

forumReportSchema.index({ status: 1, createdAt: -1 });
forumReportSchema.index({ post: 1, reporter: 1, comment: 1 }, { unique: true });

export const ForumReport: Model<IForumReport> =
  (models.ForumReport as Model<IForumReport>) ??
  model<IForumReport>("ForumReport", forumReportSchema);
