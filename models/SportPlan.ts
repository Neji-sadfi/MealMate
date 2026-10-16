// Owner: Member 6 (sport)
import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  EQUIPMENT,
  SPORT_GOALS,
  SPORT_LEVELS,
  WEEKDAYS,
  type Equipment,
  type SportGoal,
  type SportLevel,
  type Weekday,
} from "./enums";

export interface ISportPlan {
  user: Types.ObjectId;
  goal: SportGoal;
  level: SportLevel;
  days: Weekday[];
  sessionDurationMinutes: number;
  equipment: Equipment;
  /** Monday of the planned week. */
  weekStart: Date;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const sportPlanSchema = new Schema<ISportPlan>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    goal: { type: String, enum: SPORT_GOALS, required: true },
    level: { type: String, enum: SPORT_LEVELS, required: true },
    days: { type: [String], enum: WEEKDAYS, default: [] },
    sessionDurationMinutes: { type: Number, default: 45, min: 10 },
    equipment: { type: String, enum: EQUIPMENT, default: "none" },
    weekStart: { type: Date, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

sportPlanSchema.index({ user: 1, weekStart: -1 });

export const SportPlan: Model<ISportPlan> =
  (models.SportPlan as Model<ISportPlan>) ?? model<ISportPlan>("SportPlan", sportPlanSchema);
