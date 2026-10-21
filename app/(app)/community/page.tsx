import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ForumPostForm } from "@/features/community/components/ForumPostForm";
import { ForumPostActions } from "@/features/community/components/ForumPostActions";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumLike } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";
import { Types } from "mongoose";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const t = await getTranslations("pages.community");
  const userId = await getCurrentUserId();
  const adminId = userId ? await getCurrentAdminId() : null;
  const posts = userId
    ? await ForumPost.find({ status: "visible" })
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    : [];
  const likedIds =
    userId && posts.length > 0
      ? new Set(
          (
            await ForumLike.find({
              user: userId,
              post: { $in: posts.map((post) => post._id) },
            }).distinct("post")
          ).map(String),
        )
      : new Set<string>();

  return (
    <div className="flex flex-col gap-4">
      <section className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("subtitle")}</p>
      </section>
      <ForumPostForm />
      {posts.length === 0 ? (
        <Card>
          <h2 className="font-bold">No discussions yet</h2>
          <p className="mt-1 text-sm text-muted">
            Community posts will appear here when members share them.
          </p>
        </Card>
      ) : (
        posts.map((post) => {
          const author = post.author as unknown as { _id: Types.ObjectId; name: string };
          return (
            <Card key={post._id.toString()} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{author.name}</p>
                <span className="text-xs text-muted">{post.likesCount} likes</span>
              </div>
              <h2 className="text-lg font-bold">{post.title}</h2>
              <p className="text-sm">{post.content}</p>
              <p className="text-xs text-muted capitalize">
                {post.category.replaceAll("_", " ")} · {post.commentsCount} comments
              </p>
              <ForumPostActions
                postId={post._id.toString()}
                title={post.title}
                content={post.content}
                likesCount={post.likesCount}
                isLiked={likedIds.has(post._id.toString())}
                canManage={post.author._id.toString() === userId?.toString()}
                isAdmin={Boolean(adminId)}
              />
            </Card>
          );
        })
      )}
    </div>
  );
}
