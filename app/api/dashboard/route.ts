import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardData } from "@/features/meal-plan/services/dashboard-service";

// GET /api/dashboard — same service as the Home page, for other clients.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDashboardData(session.user.id));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
