// Owner: Member 6 (sport)
import { Schema, model, models, type Model, type Types } from "mongoose";
import { WORKOUT_STATUSES, type WorkoutStatus } from "./enums";

export interface IExercise {
  name: string;
  sets: number;
  /** Repetitions per set. Leave empty for timed exercises. */
  repetitions?: number;
  /** For timed exercises such as a plank. */
  durationSeconds?: number;
  restSeconds: number;
  tip?: string;
}

export interface IWorkoutPhase {
  durationMinutes: number;
  description: string;
}

export interface IWorkoutSession {
  sportPlan: Types.ObjectId;
  user: Types.ObjectId;
  /** e.g. "Full body C". */
  name: string;
  /** e.g. "Legs, shoulders & core". */
  focus?: string;
  scheduledAt: Date;
  durationMinutes: number;
  status: WorkoutStatus;
  warmUp?: IWorkoutPhase;
  exercises: IExercise[];
  coolDown?: IWorkoutPhase;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const exerciseSchema = new Schema<IExercise>(
  {
    name: { type: String, required: true },
    sets: { type: Number, required: true, min: 1 },
    repetitions: { type: Number, min: 1 },
    durationSeconds: { type: Number, min: 1 },
    restSeconds: { type: Number, default: 60, min: 0 },
    tip: String,
  },
  { _id: false },
);

const phaseSchema = new Schema<IWorkoutPhase>(
  {
    durationMinutes: { type: Number, required: true, min: 0 },
    description: { type: String, required: true },
  },
  { _id: false },
);

const workoutSessionSchema = new Schema<IWorkoutSession>(
  {
    sportPlan: { type: Schema.Types.ObjectId, ref: "SportPlan", required: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    focus: String,
    scheduledAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    status: { type: String, enum: WORKOUT_STATUSES, default: "planned" },
    warmUp: phaseSchema,
    exercises: { type: [exerciseSchema], default: [] },
    coolDown: phaseSchema,
    completedAt: Date,
  },
  { timestamps: true },
);

workoutSessionSchema.index({ user: 1, scheduledAt: 1 });
workoutSessionSchema.index({ sportPlan: 1 });

export const WorkoutSession: Model<IWorkoutSession> =
  (models.WorkoutSession as Model<IWorkoutSession>) ??
  model<IWorkoutSession>("WorkoutSession", workoutSessionSchema);
