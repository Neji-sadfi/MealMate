import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumComment } from "@/models/ForumComment";
import { ForumLike } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";
import { ForumReport } from "@/models/ForumReport";

type Context = { params: Promise<{ id: string }> };

export async function GET(_: Request, { params }: Context) {
  if (!(await getCurrentUserId()))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const post = await ForumPost.findOne({ _id: id, status: "visible" })
    .populate("author", "name")
    .lean();
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  return NextResponse.json(post);
}

export async function PUT(request: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z
    .object({
      title: z.string().trim().min(3).max(140).optional(),
      content: z.string().trim().min(1).max(5000).optional(),
    })
    .refine((value) => Object.keys(value).length > 0)
    .safeParse(body);
  if (!parsed.success)
    return NextResponse.json(
      { error: "Invalid post", issues: parsed.error.issues },
      { status: 400 },
    );
  const post = await ForumPost.findOneAndUpdate(
    { _id: id, author: userId },
    { $set: parsed.data },
    { returnDocument: "after", runValidators: true },
  ).populate("author", "name");
  if (!post)
    return NextResponse.json({ error: "Post not found or not owned by you" }, { status: 404 });
  return NextResponse.json(post);
}

export async function DELETE(_: Request, { params }: Context) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!Types.ObjectId.isValid(id))
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const adminId = await getCurrentAdminId();
  const filter = adminId ? { _id: id } : { _id: id, author: userId };
  const post = await ForumPost.findOneAndDelete(filter);
  if (!post)
    return NextResponse.json({ error: "Post not found or not owned by you" }, { status: 404 });
  await Promise.all([
    ForumComment.deleteMany({ post: post._id }),
    ForumLike.deleteMany({ post: post._id }),
    ForumReport.deleteMany({ post: post._id }),
  ]);
  return NextResponse.json({ deleted: true, postId: id });
}
