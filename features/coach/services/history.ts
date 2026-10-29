import type { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { CoachMessage } from "@/models/CoachMessage";

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Number of past messages shown when the chat opens. */
const HISTORY_LIMIT = 50;

export async function loadCoachHistory(userId: Types.ObjectId): Promise<ChatMessage[]> {
  await connectToDatabase();
  const rows = await CoachMessage.find({ userId })
    .sort({ createdAt: -1, _id: -1 })
    .limit(HISTORY_LIMIT)
    .select("role content")
    .lean();
  return rows.reverse().map(({ role, content }) => ({ role, content }));
}

/** Saves one question and Mia's answer, in order. */
export async function saveCoachExchange(
  userId: Types.ObjectId,
  question: string,
  answer: string,
): Promise<void> {
  await connectToDatabase();
  const now = Date.now();
  await CoachMessage.insertMany([
    { userId, role: "user", content: question, createdAt: new Date(now) },
    { userId, role: "assistant", content: answer.slice(0, 8000), createdAt: new Date(now + 1) },
  ]);
}

export async function clearCoachHistory(userId: Types.ObjectId): Promise<void> {
  await connectToDatabase();
  await CoachMessage.deleteMany({ userId });
}
