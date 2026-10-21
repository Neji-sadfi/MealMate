import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumComment } from "@/models/ForumComment";
import { ForumPost } from "@/models/ForumPost";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const comments = await ForumComment.find({ post: id, status: "visible" }).populate("author", "name").sort({ createdAt: 1 }).lean();
  return NextResponse.json(comments);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const parsed = z.object({ content: z.string().trim().min(1).max(2000) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid comment", issues: parsed.error.issues }, { status: 400 });
  const post = await ForumPost.findOne({ _id: id, status: "visible" });
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const [comment] = await Promise.all([
    ForumComment.create({ post: post._id, author: userId, content: parsed.data.content }),
    ForumPost.updateOne({ _id: post._id }, { $inc: { commentsCount: 1 } }),
  ]);
  await comment.populate("author", "name");
  return NextResponse.json(comment, { status: 201 });
}
