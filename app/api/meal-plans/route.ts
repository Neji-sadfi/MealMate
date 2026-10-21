import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createWeekSchema, weekStartQuerySchema } from "@/features/meal-plan/schemas";
import {
  getOrCreateMealPlan,
  mealPlanErrorResponse,
} from "@/features/meal-plan/services/meal-plan-service";
import { currentWeekStartIso } from "@/features/meal-plan/services/plan-dates";

// GET /api/meal-plans?weekStart=YYYY-MM-DD
// Returns the signed-in user's plan for that week (created empty on first
// open), or an empty plan object for a week that has never been touched.
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = weekStartQuerySchema.safeParse({
    weekStart: searchParams.get("weekStart") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weekStart." }, { status: 400 });
  }

  try {
    const plan = await getOrCreateMealPlan(
      session.user.id,
      parsed.data.weekStart ?? currentWeekStartIso(),
    );
    return NextResponse.json(plan);
  } catch (error) {
    return mealPlanErrorResponse(error);
  }
}

// POST /api/meal-plans { weekStart } — creates the empty week (idempotent).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createWeekSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid weekStart." }, { status: 400 });
  }

  try {
    const plan = await getOrCreateMealPlan(session.user.id, parsed.data.weekStart);
    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    return mealPlanErrorResponse(error);
  }
}
