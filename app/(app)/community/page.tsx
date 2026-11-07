import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/Card";
import { ForumPostForm } from "@/features/community/components/ForumPostForm";
import { ForumPostActions } from "@/features/community/components/ForumPostActions";
import { getCurrentAdminId } from "@/lib/admin";
import { getCurrentUserId } from "@/lib/current-user";
import { ForumLike, type ForumReactionType } from "@/models/ForumLike";
import { ForumPost } from "@/models/ForumPost";
import { Types } from "mongoose";
import { PhotoHero } from "@/components/ui/PhotoHero";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("pages.community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const t = await getTranslations("pages.community");
  const locale = await getLocale();
  const userId = await getCurrentUserId();
  const adminId = userId ? await getCurrentAdminId() : null;
  const posts = userId
    ? await ForumPost.find({ status: "visible" })
        .populate("author", "name")
        .sort({ createdAt: -1 })
        .limit(50)
        .lean()
    : [];
  const postIds = posts.map((post) => post._id);
  const [reactionTotals, userReactions] =
    userId && postIds.length > 0
      ? await Promise.all([
          ForumLike.aggregate<{
            _id: { post: Types.ObjectId; reaction: ForumReactionType };
            count: number;
          }>([
            { $match: { post: { $in: postIds } } },
            {
              $group: {
                _id: {
                  post: "$post",
                  reaction: { $ifNull: ["$reaction", "like"] },
                },
                count: { $sum: 1 },
              },
            },
          ]),
          ForumLike.find({ user: userId, post: { $in: postIds } })
            .select("post reaction")
            .lean(),
        ])
      : [[], []];
  const reactionCounts = new Map<string, Record<ForumReactionType, number>>();
  for (const total of reactionTotals) {
    const postId = total._id.post.toString();
    const counts = reactionCounts.get(postId) ?? { like: 0, helpful: 0, inspiring: 0 };
    counts[total._id.reaction] = total.count;
    reactionCounts.set(postId, counts);
  }
  const reactionByPost = new Map(
    userReactions.map((reaction) => [reaction.post.toString(), reaction.reaction ?? "like"]),
  );

  return (
    <div className="flex flex-col gap-4">
      <PhotoHero image="community" title={t("title")} subtitle={t("subtitle")} />
      <ForumPostForm />
      {posts.length === 0 ? (
        <Card>
          <h2 className="font-bold">{t("empty.title")}</h2>
          <p className="mt-1 text-sm text-muted">{t("empty.body")}</p>
        </Card>
      ) : (
        posts.map((post) => {
          const author = post.author as unknown as { _id: Types.ObjectId; name: string } | null;
          const authorName = author?.name ?? t("deletedMember");
          return (
            <Card
              key={post._id.toString()}
              className="flex flex-col gap-4 border border-border/70 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-tint text-sm font-bold text-primary"
                >
                  {authorName
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part) => part[0] ?? "")
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{authorName}</p>
                  <p className="text-xs text-muted">
                    {post.createdAt.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-US", {
                      dateStyle: "medium",
                    })}
                  </p>
                </div>
                <span className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-primary">
                  {t(`actions.categories.${post.category}`)}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">{post.title}</h2>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                  {post.content}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {t("reactionTotal", { count: post.likesCount })} ·{" "}
                  {t("comments", { count: post.commentsCount })}
                </p>
              </div>
              <ForumPostActions
                postId={post._id.toString()}
                title={post.title}
                content={post.content}
                reactionCounts={
                  reactionCounts.get(post._id.toString()) ?? {
                    like: 0,
                    helpful: 0,
                    inspiring: 0,
                  }
                }
                userReaction={reactionByPost.get(post._id.toString())}
                canManage={author?._id.toString() === userId?.toString()}
                isAdmin={Boolean(adminId)}
                currentUserId={userId?.toString()}
              />
            </Card>
          );
        })
      )}
    </div>
  );
}
