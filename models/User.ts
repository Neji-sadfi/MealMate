// Owner: Member 1 (auth + profile)
import { Schema, model, models, type Model } from "mongoose";
import {
  ACTIVITY_LEVELS,
  DEFAULT_CURRENCY,
  DIETS,
  EQUIPMENT,
  NUTRITION_GOALS,
  ROLES,
  SPORT_GOALS,
  SPORT_LEVELS,
  WEEKDAYS,
  type ActivityLevel,
  type Diet,
  type Equipment,
  type NutritionGoal,
  type Role,
  type SportGoal,
  type SportLevel,
  type Weekday,
} from "./enums";

export interface IUserPreferences {
  diet: Diet;
  allergies: string[];
  intolerances: string[];
  goal: NutritionGoal;
  activityLevel: ActivityLevel;
  weeklyBudget: number;
  currency: string;
  dailyCaloriesTarget?: number;
  dailyProteinTarget?: number;
  sportGoal: SportGoal;
  level: SportLevel;
  availableDays: Weekday[];
  sessionDurationMinutes: number;
  equipment: Equipment;
}

export interface IUser {
  name: string;
  email: string;
  /** bcrypt hash. Not returned by default: use .select("+passwordHash"). */
  passwordHash: string;
  role: Role;
  age?: number;
  heightCm?: number;
  weightKg?: number;
  occupation?: string;
  city?: string;
  preferences: IUserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

const preferencesSchema = new Schema<IUserPreferences>(
  {
    diet: { type: String, enum: DIETS, default: "none" },
    allergies: { type: [String], default: [] },
    intolerances: { type: [String], default: [] },
    goal: { type: String, enum: NUTRITION_GOALS, default: "balanced" },
    activityLevel: { type: String, enum: ACTIVITY_LEVELS, default: "moderate" },
    weeklyBudget: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: DEFAULT_CURRENCY },
    dailyCaloriesTarget: { type: Number, min: 0 },
    dailyProteinTarget: { type: Number, min: 0 },
    sportGoal: { type: String, enum: SPORT_GOALS, default: "fitness" },
    level: { type: String, enum: SPORT_LEVELS, default: "beginner" },
    availableDays: { type: [String], enum: WEEKDAYS, default: [] },
    sessionDurationMinutes: { type: Number, min: 10, max: 180, default: 45 },
    equipment: { type: String, enum: EQUIPMENT, default: "none" },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: "USER" },
    age: { type: Number, min: 10, max: 120 },
    heightCm: { type: Number, min: 50, max: 260 },
    weightKg: { type: Number, min: 20, max: 400 },
    occupation: { type: String, trim: true },
    city: { type: String, trim: true },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export const User: Model<IUser> = (models.User as Model<IUser>) ?? model<IUser>("User", userSchema);
