import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumLike, type ForumReactionType } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";

const requestSchema = z.object({
  reaction: z.enum(["like", "helpful", "inspiring"]),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }
  if (!(await ForumPost.exists({ _id: id, status: "visible" }))) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reaction" }, { status: 400 });
  }

  const existing = await ForumLike.findOne({ post: id, user: userId });
  const reaction: ForumReactionType | null =
    existing?.reaction === parsed.data.reaction ? null : parsed.data.reaction;

  if (!existing && reaction) {
    try {
      await ForumLike.create({ post: id, user: userId, reaction });
      await ForumPost.updateOne({ _id: id }, { $inc: { likesCount: 1 } });
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && error.code === 11000) {
        return NextResponse.json({ error: "Reaction already recorded" }, { status: 409 });
      }
      throw error;
    }
  } else if (existing && reaction) {
    existing.reaction = reaction;
    await existing.save();
  } else if (existing) {
    await existing.deleteOne();
    await ForumPost.updateOne({ _id: id, likesCount: { $gt: 0 } }, { $inc: { likesCount: -1 } });
  }

  return NextResponse.json({ postId: id, reaction });
}
