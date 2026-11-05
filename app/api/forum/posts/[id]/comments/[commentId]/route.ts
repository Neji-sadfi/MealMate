import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumComment } from "@/models/ForumComment";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";

type Context = { params: Promise<{ id: string; commentId: string }> };

/** A comment can be deleted by its author or by an admin. */
export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, commentId } = await params;
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(commentId)) {
    return NextResponse.json({ error: "Comment not found" }, { status: 404 });
  }

  const adminId = await getCurrentAdminId();
  const comment = await ForumComment.findOneAndDelete({
    _id: commentId,
    post: id,
    ...(adminId ? {} : { author: userId }),
  });
  if (!comment) {
    return NextResponse.json({ error: "Comment not found or not yours" }, { status: 404 });
  }

  await Promise.all([
    ForumPost.updateOne(
      { _id: comment.post, commentsCount: { $gt: 0 } },
      { $inc: { commentsCount: -1 } },
    ),
    ForumReport.deleteMany({ comment: comment._id }),
  ]);
  return NextResponse.json({ deleted: true, commentId });
}
