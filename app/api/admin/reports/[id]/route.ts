import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentAdminId } from "@/lib/admin";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminId = await getCurrentAdminId();
  if (!adminId) return NextResponse.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const parsed = z
    .object({ action: z.enum(["hide", "dismiss"]) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid moderation action" }, { status: 400 });
  }

  const report = await ForumReport.findOne({ _id: id, status: "pending" });
  if (!report) return NextResponse.json({ error: "Pending report not found" }, { status: 404 });

  if (parsed.data.action === "hide") {
    const post = await ForumPost.findByIdAndUpdate(
      report.post,
      { $set: { status: "hidden" } },
      { returnDocument: "after" },
    );
    if (!post) return NextResponse.json({ error: "Reported post not found" }, { status: 404 });

    await ForumReport.updateMany(
      { post: report.post, status: "pending" },
      { $set: { status: "reviewed", reviewedBy: adminId } },
    );
    return NextResponse.json({ status: "hidden", postId: post._id.toString() });
  }

  await ForumReport.updateOne(
    { _id: report._id },
    { $set: { status: "dismissed", reviewedBy: adminId } },
  );
  await ForumPost.updateOne(
    { _id: report.post, reportsCount: { $gt: 0 } },
    { $inc: { reportsCount: -1 } },
  );
  return NextResponse.json({ status: "dismissed", reportId: report._id.toString() });
}
