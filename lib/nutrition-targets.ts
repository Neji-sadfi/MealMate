import type { ActivityLevel, NutritionGoal } from "@/models/enums";
import type { IUser } from "@/models/User";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const GOAL_KCAL_ADJUSTMENT: Record<NutritionGoal, number> = {
  weight_loss: -400,
  maintenance: 0,
  balanced: 0,
  muscle_gain: 300,
};

const PROTEIN_G_PER_KG: Record<NutritionGoal, number> = {
  weight_loss: 1.6,
  maintenance: 1.2,
  balanced: 1.2,
  muscle_gain: 1.8,
};

const DEFAULT_AGE = 30;
const MIN_DAILY_KCAL = 1200;

export type NutritionProfile = Partial<Pick<IUser, "age" | "heightCm" | "weightKg">> & {
  preferences?: Pick<
    IUser["preferences"],
    "goal" | "activityLevel" | "dailyCaloriesTarget" | "dailyProteinTarget"
  >;
};

export type DailyTargets = { kcal: number; protein: number };

/**
 * Daily targets: the ones the user chose, otherwise an estimate from the profile.
 * Mifflin-St Jeor equation. The profile has no sex field, so it uses the average
 * of the male (+5) and female (-161) constants.
 */
export function dailyTargets(profile: NutritionProfile | null | undefined): DailyTargets {
  const preferences = profile?.preferences;
  const goal = preferences?.goal ?? "balanced";
  const activity = preferences?.activityLevel ?? "moderate";
  const weight = profile?.weightKg;
  const height = profile?.heightCm;

  let kcal = 2000;
  let protein = 130;
  if (weight && height) {
    const age = profile?.age ?? DEFAULT_AGE;
    const restingKcal = 10 * weight + 6.25 * height - 5 * age - 78;
    const dailyKcal = restingKcal * ACTIVITY_FACTOR[activity] + GOAL_KCAL_ADJUSTMENT[goal];
    kcal = Math.max(MIN_DAILY_KCAL, Math.round(dailyKcal / 10) * 10);
    protein = Math.round(weight * PROTEIN_G_PER_KG[goal]);
  }

  return {
    kcal: preferences?.dailyCaloriesTarget || kcal,
    protein: preferences?.dailyProteinTarget || protein,
  };
}
