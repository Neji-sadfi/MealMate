// Shared enum values used by models, zod schemas and the UI.
// UI labels for these values live in messages/en.json, never here.

export const ROLES = ["USER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const DIETS = [
  "none",
  "vegetarian",
  "vegan",
  "gluten_free",
  "lactose_free",
  "low_carb",
] as const;
export type Diet = (typeof DIETS)[number];

export const NUTRITION_GOALS = ["maintenance", "weight_loss", "muscle_gain", "balanced"] as const;
export type NutritionGoal = (typeof NUTRITION_GOALS)[number];

export const ACTIVITY_LEVELS = ["sedentary", "light", "moderate", "active", "very_active"] as const;
export type ActivityLevel = (typeof ACTIVITY_LEVELS)[number];

export const SPORT_GOALS = [
  "muscle_gain",
  "weight_loss",
  "endurance",
  "fitness",
  "maintenance",
] as const;
export type SportGoal = (typeof SPORT_GOALS)[number];

export const SPORT_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SportLevel = (typeof SPORT_LEVELS)[number];

export const EQUIPMENT = ["none", "home", "gym"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "piece",
  "tbsp",
  "tsp",
  "bunch",
  "pot",
  "to_taste",
] as const;
export type Unit = (typeof UNITS)[number];

export const AISLES = [
  "fruits_vegetables",
  "fresh_protein",
  "dairy",
  "grocery",
  "bakery",
  "frozen",
  "drinks",
  "other",
] as const;
export type Aisle = (typeof AISLES)[number];

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const EXPENSE_CATEGORIES = ["fresh_products", "grocery", "eating_out", "other"] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const NOTIFICATION_TYPES = [
  "meal_reminder",
  "budget_alert",
  "expiry_alert",
  "workout_reminder",
  "forum_activity",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const WORKOUT_STATUSES = ["planned", "done", "skipped"] as const;
export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const FORUM_CATEGORIES = [
  "nutrition",
  "weight_loss",
  "muscle_gain",
  "training",
  "motivation",
] as const;
export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export const MODERATION_STATUSES = ["visible", "hidden"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export const REPORT_REASONS = ["spam", "offensive", "medical_misinformation", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const REPORT_STATUSES = ["pending", "reviewed", "dismissed"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const DEFAULT_CURRENCY = "TND";
