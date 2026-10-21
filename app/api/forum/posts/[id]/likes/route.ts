import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumLike } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  if (!(await ForumPost.exists({ _id: id, status: "visible" })))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const existing = await ForumLike.findOneAndDelete({ post: id, user: userId });
  if (existing) {
    await ForumPost.updateOne({ _id: id, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } });
    return NextResponse.json({ postId: id, liked: false });
  }
  try {
    await ForumLike.create({ post: id, user: userId });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ postId: id, liked: true });
    }
    throw error;
  }
  await ForumPost.updateOne({ _id: id }, { $inc: { likesCount: 1 } });
  return NextResponse.json({ postId: id, liked: true }, { status: 201 });
}
