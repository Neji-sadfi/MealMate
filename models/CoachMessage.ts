// Owner: Member 1 (auth + profile) — Mia coach chat history
import { Schema, Types, model, models, type Model } from "mongoose";

export interface ICoachMessage {
  userId: Types.ObjectId;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

const coachMessageSchema = new Schema<ICoachMessage>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true, maxlength: 8000 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

coachMessageSchema.index({ userId: 1, createdAt: -1 });

export const CoachMessage: Model<ICoachMessage> =
  (models.CoachMessage as Model<ICoachMessage>) ??
  model<ICoachMessage>("CoachMessage", coachMessageSchema);
