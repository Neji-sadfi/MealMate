"use server";

import { getCurrentUserId } from "@/lib/current-user";
import { clearCoachHistory } from "./history";

/** "New conversation": deletes the saved chat of the signed-in user. */
export async function clearCoachHistoryAction(): Promise<{ ok: boolean }> {
  const userId = await getCurrentUserId();
  if (!userId) return { ok: false };
  try {
    await clearCoachHistory(userId);
    return { ok: true };
  } catch (error) {
    console.error("clear coach history failed", error);
    return { ok: false };
  }
}
