// Owner: Member 5 (community + tracking)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { NOTIFICATION_TYPES, type NotificationType } from "./enums";

export interface INotification {
  user: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  /** Optional in-app link, e.g. "/shopping/inventory". */
  link?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  (models.Notification as Model<INotification>) ??
  model<INotification>("Notification", notificationSchema);
