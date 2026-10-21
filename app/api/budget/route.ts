import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { Budget } from "@/models/Budget";
import { User } from "@/models/User";

function currentWeekStart() {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [budget, user] = await Promise.all([
    Budget.findOne({ user: userId, weekStart: currentWeekStart() }).lean(),
    User.findById(userId).select("preferences.weeklyBudget preferences.currency").lean(),
  ]);
  const limit = budget?.limit ?? user?.preferences.weeklyBudget ?? 0;
  const spent = budget?.expenses.reduce((sum, expense) => sum + expense.amount, 0) ?? 0;
  return NextResponse.json({
    weekStart: currentWeekStart(),
    limit,
    spent,
    remaining: Math.max(0, limit - spent),
    currency: budget?.currency ?? user?.preferences.currency ?? "TND",
    expenses: budget?.expenses ?? [],
  });
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({
    limit: z.number().min(0).optional(),
    expense: z.object({
      label: z.string().trim().min(1).max(120),
      category: z.enum(["fresh_products", "grocery", "eating_out", "other"]).default("other"),
      amount: z.number().min(0),
      date: z.coerce.date().optional(),
    }).optional(),
  }).refine((value) => value.limit !== undefined || value.expense !== undefined).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid budget update", issues: parsed.error.issues }, { status: 400 });

  const week = currentWeekStart();
  const user = await User.findById(userId).select("preferences.currency").lean();
  const update: Record<string, unknown> = {
    $setOnInsert: { user: userId, weekStart: week, currency: user?.preferences.currency ?? "TND", ...(parsed.data.limit === undefined ? { limit: 0 } : {}) },
  };
  if (parsed.data.limit !== undefined) update.$set = { limit: parsed.data.limit };
  if (parsed.data.expense) update.$push = { expenses: parsed.data.expense };
  const budget = await Budget.findOneAndUpdate(
    { user: userId, weekStart: week },
    update,
    { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
  );
  return NextResponse.json(budget);
}
