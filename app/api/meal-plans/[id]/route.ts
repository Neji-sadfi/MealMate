import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mealPlanActionSchema } from "@/features/meal-plan/schemas";
import {
  applyMealPlanAction,
  deleteMealPlanWeek,
  mealPlanErrorResponse,
} from "@/features/meal-plan/services/meal-plan-service";

type RouteContext = { params: Promise<{ id: string }> };

// PUT /api/meal-plans/[id] — one body with an "action" field, validated with
// a zod discriminated union, always answered with the updated plan view.
export async function PUT(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = mealPlanActionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid meal plan action." }, { status: 400 });
  }

  try {
    const plan = await applyMealPlanAction(session.user.id, id, parsed.data);
    return NextResponse.json(plan);
  } catch (error) {
    return mealPlanErrorResponse(error);
  }
}

// DELETE /api/meal-plans/[id] — deletes the week (plan + meals).
export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  try {
    await deleteMealPlanWeek(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mealPlanErrorResponse(error);
  }
}
