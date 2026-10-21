import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentAdminId } from "@/lib/admin";
import { ForumComment } from "@/models/ForumComment";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentAdminId())) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }
  const comment = await ForumComment.findByIdAndDelete(id);
  if (!comment) return NextResponse.json({ error: "Comment not found" }, { status: 404 });

  await Promise.all([
    ForumPost.updateOne(
      { _id: comment.post, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
    ),
    ForumReport.deleteMany({ comment: comment._id }),
  ]);
  return NextResponse.json({ deleted: true, commentId: id });
}
