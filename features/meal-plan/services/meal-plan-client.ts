import type { MealPlanAction } from "../schemas";
import type { GeneratorWarning, MealPlanView } from "../types";
import {
  cachePlan,
  countPendingActions,
  flushPendingActions,
  queuePendingRequest,
  readCachedPlan,
} from "./offline-cache";

// Small fetch wrapper around my own meal-plan API. Only used from client
// components; every call throws on a non-2xx response and the screen maps
// failures to a next-intl message (never to a server string).
//
// When the device is offline the plan is read from the IndexedDB cache and the
// changes are queued, so the user can keep working and the changes are
// replayed once the connection is back.

/** Thrown when a change was made offline: it will be sent later. */
export class OfflineError extends Error {
  constructor() {
    super("The device is offline.");
    this.name = "OfflineError";
  }
}

/** True when the request never reached the server (no answer, not a 4xx/5xx). */
function isNetworkError(error: unknown): boolean {
  return (
    error instanceof TypeError && /fetch|network|load failed|failed to load/i.test(error.message)
  );
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

export type WeekPlanResult = {
  plan: MealPlanView;
  /** True when the plan comes from the offline cache instead of the server. */
  fromCache: boolean;
};

export async function fetchWeekPlan(weekStart: string): Promise<WeekPlanResult> {
  try {
    const plan = await request<MealPlanView>(`/api/meal-plans?weekStart=${weekStart}`);
    await cachePlan(weekStart, plan);
    return { plan, fromCache: false };
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    const cached = await readCachedPlan(weekStart);
    if (!cached) throw error;
    return { plan: cached, fromCache: true };
  }
}

export async function sendMealPlanAction(
  planId: string,
  action: MealPlanAction,
): Promise<MealPlanView> {
  try {
    const plan = await request<MealPlanView>(`/api/meal-plans/${planId}`, {
      method: "PUT",
      body: JSON.stringify(action),
    });
    await cachePlan(plan.weekStart, plan);
    return plan;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    // Keep the change: it is replayed against the API once the network is back.
    await queuePendingRequest(`/api/meal-plans/${planId}`, "PUT", action);
    throw new OfflineError();
  }
}

export async function deleteWeekPlan(planId: string): Promise<void> {
  try {
    await request<{ ok: boolean }>(`/api/meal-plans/${planId}`, { method: "DELETE" });
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await queuePendingRequest(`/api/meal-plans/${planId}`, "DELETE");
    throw new OfflineError();
  }
}

export type GeneratePlanResult = { plan: MealPlanView; warnings: GeneratorWarning[] };

export async function generateWeekPlan(body: {
  weekStart: string;
  days?: number;
  mealsPerDay?: number;
  extraBudget?: number;
  people?: number;
}): Promise<GeneratePlanResult> {
  try {
    const result = await request<GeneratePlanResult>("/api/meal-plans/generate", {
      method: "POST",
      body: JSON.stringify(body),
    });
    await cachePlan(result.plan.weekStart, result.plan);
    return result;
  } catch (error) {
    if (!isNetworkError(error)) throw error;
    await queuePendingRequest("/api/meal-plans/generate", "POST", body);
    throw new OfflineError();
  }
}

/** Sends the changes made while offline. Exported for the screen. */
export { countPendingActions, flushPendingActions };
