import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";
import { REPORT_REASONS } from "@/models/enums";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const parsed = z
    .object({
      reason: z.enum(REPORT_REASONS),
      details: z.string().trim().max(1000).optional(),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid report", issues: parsed.error.issues },
      { status: 400 },
    );
  if (!(await ForumPost.exists({ _id: id })))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  let report;
  try {
    report = await ForumReport.create({ post: id, reporter: userId, ...parsed.data });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "You have already reported this post" }, { status: 409 });
    }
    throw error;
  }
  await ForumPost.updateOne({ _id: id }, { $inc: { reportsCount: 1 } });
  return NextResponse.json({ id: report._id.toString(), status: report.status }, { status: 201 });
}
