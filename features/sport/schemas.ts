import { z } from "zod";
import { EQUIPMENT, SPORT_GOALS, SPORT_LEVELS, WEEKDAYS } from "@/models/enums";

export const workoutSettingsSchema = z
  .object({
    goal: z.enum(SPORT_GOALS),
    level: z.enum(SPORT_LEVELS),
    days: z.array(z.enum(WEEKDAYS)).min(1).max(7),
    sessionDurationMinutes: z.number().int().min(10).max(180),
    equipment: z.enum(EQUIPMENT),
  })
  .refine((value) => new Set(value.days).size === value.days.length, {
    message: "Workout days must be unique.",
    path: ["days"],
  });

export const workoutPhaseSchema = z.object({
  durationMinutes: z.number().int().min(2).max(20),
  description: z.string().trim().min(10).max(500),
});

export const workoutExerciseSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    sets: z.number().int().min(1).max(5),
    repetitions: z.number().int().min(1).max(50).optional(),
    durationSeconds: z.number().int().min(10).max(600).optional(),
    restSeconds: z.number().int().min(0).max(300),
    tip: z.string().trim().min(10).max(350),
  })
  .refine(
    (exercise) => (exercise.repetitions !== undefined) !== (exercise.durationSeconds !== undefined),
    {
      message: "An exercise needs either repetitions or a duration.",
    },
  );

export const workoutSessionPreviewSchema = z.object({
  day: z.enum(WEEKDAYS),
  name: z.string().trim().min(2).max(120),
  focus: z.string().trim().min(2).max(200),
  warmUp: workoutPhaseSchema,
  exercises: z.array(workoutExerciseSchema).min(3).max(8),
  coolDown: workoutPhaseSchema,
});

export const workoutProgramSchema = z
  .object({
    settings: workoutSettingsSchema,
    sessions: z.array(workoutSessionPreviewSchema).min(1).max(7),
  })
  .superRefine(({ settings, sessions }, context) => {
    const sessionDays = sessions.map((session) => session.day);
    if (
      sessionDays.length !== settings.days.length ||
      new Set(sessionDays).size !== settings.days.length ||
      settings.days.some((day) => !sessionDays.includes(day))
    ) {
      context.addIssue({
        code: "custom",
        message: "The sessions must cover each selected day exactly once.",
        path: ["sessions"],
      });
    }
  });

export const exercisePhotoRequestSchema = z.object({
  names: z.array(z.string().trim().min(2).max(120)).min(1).max(56),
});

export const exercisePhotoSchema = z.object({
  imageUrl: z.string().url(),
  sourceUrl: z.string().url(),
  author: z.string().min(1).max(120),
  licenseName: z.string().min(1).max(120),
  licenseUrl: z.string().url(),
});

export const exercisePhotosResponseSchema = z.object({
  photos: z.array(
    z.object({
      name: z.string(),
      photo: exercisePhotoSchema.nullable(),
    }),
  ),
});

export type WorkoutSettings = z.infer<typeof workoutSettingsSchema>;
export type WorkoutProgram = z.infer<typeof workoutProgramSchema>;
export type WorkoutSessionPreview = z.infer<typeof workoutSessionPreviewSchema>;
export type ExercisePhoto = z.infer<typeof exercisePhotoSchema>;
