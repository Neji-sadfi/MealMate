import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { getCurrentUserId } from "@/lib/current-user";
import { aiProviderOptions, getGeminiModel } from "@/lib/ai";
import {
  workoutProgramSchema,
  workoutSessionPreviewSchema,
  workoutSettingsSchema,
} from "@/features/sport/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = workoutSettingsSchema.extend({ consent: z.literal(true) });
const aiOutputSchema = z.object({
  sessions: z.array(workoutSessionPreviewSchema).min(1).max(7),
});

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 3;
const hits = new Map<string, number[]>();

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
      output: Output.object({ schema: aiOutputSchema }),
      system: [
        "Create a safe, practical weekly workout program.",
        `Write all session names, focus text, warm-up/cool-down instructions and exercise tips in ${responseLanguage}.`,
        `Return exactly one session for each selected day: ${settings.days.join(", ")}.`,
        `Respect the goal ${settings.goal}, level ${settings.level}, equipment ${settings.equipment}, and limit every session to about ${settings.sessionDurationMinutes} minutes.`,
        "Include a warm-up, 3 to 8 exercises, and a cool-down in every session.",
        "Every exercise must include one concise actionable technique tip and either repetitions or a timed duration, but not both.",
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

    if (!output) {
      return NextResponse.json(
        { error: "Workout generator returned an invalid response." },
        { status: 502 },
      );
    }

    const validated = workoutProgramSchema.safeParse({ settings, sessions: output.sessions });
    if (!validated.success) {
      console.error("workout generator returned a program that failed validation");
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
