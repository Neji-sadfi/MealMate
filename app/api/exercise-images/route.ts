import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/current-user";
import { exercisePhotoRequestSchema } from "@/features/sport/schemas";
import { findExercisePhotos } from "@/features/sport/services/exercise-images";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = exercisePhotoRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid exercise names" }, { status: 400 });
  }

  try {
    const photos = await findExercisePhotos(parsed.data.names);
    return NextResponse.json({ photos });
  } catch (error) {
    console.error("Exercise photo catalogue unavailable", error);
    return NextResponse.json(
      { error: "Exercise photos are temporarily unavailable" },
      { status: 503 },
    );
  }
}
