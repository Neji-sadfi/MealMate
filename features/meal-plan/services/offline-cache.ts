import type { MealPlanAction } from "../schemas";
import type { MealPlanView } from "../types";

// Offline cache of the meal plan, stored in IndexedDB through the shared Dexie
// database of lib/offline/db.ts (owner: Member 4, built for this purpose).
// The module is imported dynamically so the server never touches IndexedDB.

const PLAN_PREFIX = "meal-plan:";

type OfflineDb = (typeof import("@/lib/offline/db"))["offlineDb"];

async function getDb(): Promise<OfflineDb | null> {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") return null;
  try {
    const { offlineDb } = await import("@/lib/offline/db");
    return offlineDb;
  } catch (error) {
    console.warn("[meal-plan] offline cache unavailable", error);
    return null;
  }
}

/** Keeps the last version of a week on the device, so it can be read offline. */
export async function cachePlan(weekStart: string, plan: MealPlanView): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.cache.put({
      key: `${PLAN_PREFIX}${weekStart}`,
      data: plan,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn("[meal-plan] could not cache the plan", error);
  }
}

export async function readCachedPlan(weekStart: string): Promise<MealPlanView | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    const entry = await db.cache.get(`${PLAN_PREFIX}${weekStart}`);
    return (entry?.data as MealPlanView | undefined) ?? null;
  } catch {
    return null;
  }
}

/** Stores a change made while offline, so it can be replayed later. */
export async function queuePendingRequest(
  url: string,
  method: "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  try {
    await db.pendingActions.add({ url, method, body, createdAt: Date.now() });
  } catch (error) {
    console.warn("[meal-plan] could not queue the change", error);
  }
}

/**
 * Replays the queued changes, oldest first. It stops at the first failure so
 * the order of the changes is never broken.
 */
export async function flushPendingActions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  let flushed = 0;
  try {
    const pending = await db.pendingActions.orderBy("createdAt").toArray();
    for (const entry of pending) {
      try {
        const response = await fetch(entry.url, {
          method: entry.method,
          headers: { "Content-Type": "application/json" },
          body: entry.body === undefined ? undefined : JSON.stringify(entry.body),
        });
        if (!response.ok) break;
        if (entry.id !== undefined) await db.pendingActions.delete(entry.id);
        flushed += 1;
      } catch {
        break; // still offline: the queue is kept for the next attempt
      }
    }
  } catch (error) {
    console.warn("[meal-plan] could not replay the queued changes", error);
  }
  return flushed;
}

export async function countPendingActions(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  try {
    return await db.pendingActions.count();
  } catch {
    return 0;
  }
}

/** The queued change of one plan, used when the plan is replayed. */
export type QueuedPlanChange = { planId: string; action: MealPlanAction };

export async function queuePlanAction(planId: string, action: MealPlanAction): Promise<void> {
  await queuePendingRequest(`/api/meal-plans/${planId}`, "PUT", action);
}
