import { streamText } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getLocale } from "next-intl/server";
import { saveCoachExchange } from "@/features/coach/services/history";
import { getCurrentUserId } from "@/lib/current-user";
import { aiProviderOptions, getGeminiModel } from "@/lib/ai";
import { buildCoachSystemPrompt } from "@/lib/coach/prompt";
import { User } from "@/models/User";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
      }),
    )
    .min(1)
    .max(20),
});

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const hits = new Map<string, number[]>();
const STREAM_TIMEOUT_MS = 30_000;

function rateLimited(userId: string): boolean {
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
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return NextResponse.json({ error: "Coach is not configured" }, { status: 503 });
  }
  if (rateLimited(userId.toString())) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const user = await User.findById(userId).select("heightCm weightKg preferences").lean();
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const locale = await getLocale();
  const question = parsed.data.messages.at(-1);
  try {
    const result = streamText({
      model: getGeminiModel(),
      system: buildCoachSystemPrompt(user, locale),
      messages: parsed.data.messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      providerOptions: aiProviderOptions,
      maxOutputTokens: 1024,
      temperature: 0.7,
      abortSignal: AbortSignal.timeout(STREAM_TIMEOUT_MS),
      onError({ error }) {
        console.error("coach: stream interrupted", error);
      },
      async onFinish({ text }) {
        if (question?.role === "user" && text.trim()) {
          await saveCoachExchange(userId, question.content, text).catch((error) =>
            console.error("coach: could not save history", error),
          );
        }
      },
    });

    return result.toTextStreamResponse({
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("coach: could not start response", error);
    return NextResponse.json({ error: "Coach unavailable" }, { status: 502 });
  }
}
