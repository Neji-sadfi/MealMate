import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { getCurrentUserId } from "@/lib/current-user";
import { aiProviderOptions, getGeminiModel } from "@/lib/ai";
import {
  workoutProgramSchema,
  workoutSettingsSchema,
} from "@/features/sport/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = workoutSettingsSchema.extend({ consent: z.literal(true) });

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;
const hits = new Map<string, number[]>();

function recordOf(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberOf(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\s*\d+(?:\.\d+)?\s*$/.test(value)) {
    return Number(value);
  }
  return undefined;
}

function durationSecondsOf(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return undefined;
  const match = value.match(/^\s*(\d+)\s*(?:s|sec(?:ond)?s?|secondes?)\s*$/i);
  return match ? Number(match[1]) : undefined;
}

function normalizePhase(value: unknown): unknown {
  if (typeof value === "string") {
    const minutes = value.match(/(\d+)\s*(?:minutes?|mins?)\b/i)?.[1];
    return { durationMinutes: minutes ? Number(minutes) : undefined, description: value };
  }
  const phase = recordOf(value);
  if (!phase) return value;
  return {
    durationMinutes: numberOf(phase.durationMinutes),
    description: phase.description,
  };
}

function normalizeWorkoutOutput(value: unknown): unknown {
  const root = recordOf(value);
  if (!root) return value;
  const program = recordOf(root.program) ?? root;
  const sessions = program.sessions ?? program.schedule;
  if (!Array.isArray(sessions)) return value;

  return {
    sessions: sessions.map((value) => {
      const session = recordOf(value);
      if (!session) return value;
      const exercises = Array.isArray(session.exercises)
        ? session.exercises.map((value) => {
            const exercise = recordOf(value);
            if (!exercise) return value;
            const repetitions = numberOf(exercise.repetitions ?? exercise.reps);
            const durationSeconds = durationSecondsOf(
              exercise.durationSeconds ?? exercise.duration,
            );
            return {
              name: exercise.name,
              sets: numberOf(exercise.sets),
              ...(repetitions !== undefined ? { repetitions } : {}),
              ...(durationSeconds !== undefined ? { durationSeconds } : {}),
              restSeconds: numberOf(exercise.restSeconds ?? exercise.rest_seconds),
              tip: exercise.tip,
            };
          })
        : session.exercises;
      return {
        day: session.day,
        name: session.name ?? session.session_name,
        focus: session.focus,
        warmUp: normalizePhase(session.warmUp ?? session.warm_up),
        exercises,
        coolDown: normalizePhase(session.coolDown ?? session.cool_down),
      };
    }),
  };
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((hit) => now - hit < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(userId, recent);
    return true;
  }
  hits.set(userId, [...recent, now]);
  return false;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isRateLimited(userId.toString())) {
    return NextResponse.json(
      { error: "Too many workout generations. Try again shortly." },
      { status: 429 },
    );
  }
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "Workout generator is not configured." }, { status: 503 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workout preferences." }, { status: 400 });
  }
  const settings = parsed.data;
  const locale = await getLocale();
  const responseLanguage = locale === "fr" ? "French" : "English";

  try {
    const { output } = await generateText({
      model: getGeminiModel(),
      output: Output.json({
        name: "workout_program",
        description:
          "A JSON object containing sessions, each with day, name, focus, warmUp, exercises and coolDown.",
      }),
      system: [
        "Create a safe, practical weekly workout program.",
        `Write all session names, focus text, warm-up/cool-down instructions and exercise tips in ${responseLanguage}.`,
        `Return exactly one session for each selected day: ${settings.days.join(", ")}.`,
        `Respect the goal ${settings.goal}, level ${settings.level}, equipment ${settings.equipment}, and limit every session to about ${settings.sessionDurationMinutes} minutes.`,
        "Include a warm-up, 3 to 8 exercises, and a cool-down in every session.",
        "Return only this JSON shape: {\"sessions\":[{\"day\":\"mon\",\"name\":\"...\",\"focus\":\"...\",\"warmUp\":{\"durationMinutes\":5,\"description\":\"...\"},\"exercises\":[{\"name\":\"...\",\"sets\":3,\"repetitions\":10,\"restSeconds\":60,\"tip\":\"...\"}],\"coolDown\":{\"durationMinutes\":5,\"description\":\"...\"}]}].",
        "Use camelCase property names exactly as shown. Do not add a program, schedule, goal, level or equipment wrapper. Use numbers, not numeric strings. Each exercise must have exactly one of repetitions or durationSeconds.",
        "Keep the work and rest realistic for the requested total duration. Do not prescribe extreme volume, diagnose conditions, or provide medical advice.",
      ].join(" "),
      prompt: JSON.stringify({
        goal: settings.goal,
        level: settings.level,
        days: settings.days,
        sessionDurationMinutes: settings.sessionDurationMinutes,
        equipment: settings.equipment,
      }),
      providerOptions: aiProviderOptions,
      maxOutputTokens: 4096,
      temperature: 0.6,
      abortSignal: AbortSignal.timeout(45_000),
    });

    if (!output || typeof output !== "object") {
      return NextResponse.json(
        { error: "Workout generator returned an invalid response." },
        { status: 502 },
      );
    }

    const normalized = normalizeWorkoutOutput(output);
    const normalizedSessions = recordOf(normalized)?.sessions;
    const validated = workoutProgramSchema.safeParse({
      settings,
      sessions: normalizedSessions,
    });
    if (!validated.success) {
      console.error(
        "workout generator returned a program that failed validation",
        validated.error.issues,
      );
      return NextResponse.json(
        { error: "Workout generator returned an incomplete program." },
        { status: 502 },
      );
    }
    return NextResponse.json(validated.data);
  } catch (error) {
    const providerError = error as { statusCode?: number; status?: number };
    const status = providerError.statusCode ?? providerError.status;
    if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      return NextResponse.json({ error: "Workout generation timed out." }, { status: 504 });
    }
    if (status === 429) {
      return NextResponse.json({ error: "Workout generator is busy." }, { status: 429 });
    }
    console.error("workout generation request failed", error);
    return NextResponse.json(
      {
        error:
          status === 401 || status === 403
            ? "Workout generator is not configured."
            : "Workout generation is unavailable.",
      },
      { status: status === 401 || status === 403 ? 503 : 502 },
    );
  }
}
