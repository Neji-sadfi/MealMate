import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumPost } from "@/models/ForumPost";
import { FORUM_CATEGORIES } from "@/models/enums";

export async function GET(request: Request) {
  if (!(await getCurrentUserId())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const category = z.enum(FORUM_CATEGORIES).safeParse(searchParams.get("category"));
  const filter = category.success
    ? { status: "visible" as const, category: category.data }
    : { status: "visible" as const };
  const posts = await ForumPost.find(filter).populate("author", "name").sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json(posts);
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body: unknown = await request.json().catch(() => null);
  const parsed = z.object({
    title: z.string().trim().min(3).max(140),
    content: z.string().trim().min(1).max(5000),
    category: z.enum(FORUM_CATEGORIES),
  }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid post", issues: parsed.error.issues }, { status: 400 });
  const post = await ForumPost.create({ ...parsed.data, author: userId });
  await post.populate("author", "name");
  return NextResponse.json(post, { status: 201 });
}
