import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { buildCoachSystemPrompt } from "@/lib/coach/prompt";
import { saveCoachExchange } from "@/features/coach/services/history";
import { User } from "@/models/User";

export const runtime = "nodejs";

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

// Very small in-memory limiter to protect the free quota (per user, per server instance).
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 12;
const hits = new Map<string, number[]>();

const DEFAULT_MODEL = "gemini-3.6-flash";
const FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-flash-lite-latest"];
const CONNECT_TIMEOUT_MS = 10_000;
const STREAM_TIMEOUT_MS = 30_000;

function rateLimited(userId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(userId, recent);
    return true;
  }
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

// POST /api/coach: streams the coach's reply as plain text.
export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
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

  const ai = new GoogleGenAI({ apiKey });
  // Free Flash models are often overloaded (503) or hang: try the next one in the list.
  const models = [...new Set([process.env.GEMINI_MODEL ?? DEFAULT_MODEL, ...FALLBACK_MODELS])];
  const contents = parsed.data.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const systemInstruction = buildCoachSystemPrompt(user);

  let stream;
  let abort = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let busy = false;
  for (const model of models) {
    // Without a deadline a slow model leaves the chat on "Mia is thinking..." forever.
    abort = new AbortController();
    timer = setTimeout(() => abort.abort(), CONNECT_TIMEOUT_MS);
    try {
      stream = await ai.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction,
          // Gemini 3 "thinking" tokens count against maxOutputTokens: left on, they used
          // almost the whole budget and the reply was cut after a few words.
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          maxOutputTokens: 1024,
          temperature: 0.7,
          abortSignal: abort.signal,
        },
      });
      break;
    } catch (error) {
      clearTimeout(timer);
      const status = (error as { status?: number }).status;
      console.error(`coach: ${model} failed (${status ?? "timeout"})`);
      busy = abort.signal.aborted || status === 503 || status === 429 || status === 404;
      if (!busy) break;
    }
  }

  if (!stream) {
    return NextResponse.json(
      { error: busy ? "Coach busy" : "Coach unavailable" },
      { status: busy ? 504 : 502 },
    );
  }

  // The model answered: give the streamed reply more time to finish.
  clearTimeout(timer);
  timer = setTimeout(() => abort.abort(), STREAM_TIMEOUT_MS);

  const question = parsed.data.messages.at(-1);
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let reply = "";
      try {
        for await (const chunk of stream) {
          if (chunk.text) {
            reply += chunk.text;
            controller.enqueue(encoder.encode(chunk.text));
          }
        }
      } catch (error) {
        console.error("coach: stream interrupted", error);
      } finally {
        clearTimeout(timer);
        controller.close();
      }
      // Keep the exchange so the chat is still there when the user comes back.
      if (question?.role === "user" && reply.trim()) {
        await saveCoachExchange(userId, question.content, reply).catch((error) =>
          console.error("coach: could not save history", error),
        );
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
