"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Heart, Lightbulb, MessageCircle, Pencil, ThumbsUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { ForumReactionType } from "@/models/ForumLike";

type Comment = {
  _id: string;
  content: string;
  author: { name: string };
};

export function ForumPostActions({
  postId,
  title,
  content,
  reactionCounts,
  userReaction,
  canManage,
  isAdmin,
}: {
  postId: string;
  title: string;
  content: string;
  reactionCounts: Record<ForumReactionType, number>;
  userReaction?: ForumReactionType;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("pages.community.actions");
  const [selectedReaction, setSelectedReaction] = useState(userReaction);
  const [counts, setCounts] = useState(reactionCounts);
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function loadComments() {
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`);
      const result = (await response.json()) as Comment[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) {
        setError(t("loadCommentsError"));
        return;
      }
      setComments(result);
    } catch {
      setError(t("networkError"));
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  }

  async function react(reaction: ForumReactionType) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction }),
      });
      const result = (await response.json()) as { reaction?: ForumReactionType | null };
      if (!response.ok || !("reaction" in result)) {
        setError(t("reactionError"));
        return;
      }
      const nextReaction = result.reaction ?? undefined;
      setCounts((current) => ({
        ...current,
        ...(selectedReaction
          ? { [selectedReaction]: Math.max(0, current[selectedReaction] - 1) }
          : {}),
        ...(nextReaction ? { [nextReaction]: current[nextReaction] + 1 } : {}),
      }));
      setSelectedReaction(nextReaction);
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      });
      const result = (await response.json()) as Comment | { error?: string };
      if (!response.ok || !("_id" in result)) {
        setError(t("addCommentError"));
        return;
      }
      setComments((current) => [...current, result]);
      setCommentText("");
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function reportPost() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "other" }),
      });
      if (!response.ok) {
        setError(t("reportError"));
        return;
      }
      setError(t("reported"));
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function updatePost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, content: editContent }),
      });
      if (!response.ok) {
        setError(t("updateError"));
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function deletePost() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t("deleteError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  async function deleteComment(commentId: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t("deleteCommentError"));
        return;
      }
      setComments((current) => current.filter((comment) => comment._id !== commentId));
      router.refresh();
    } catch {
      setError(t("networkError"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { type: "like", label: t("reactions.like"), Icon: Heart },
            { type: "helpful", label: t("reactions.helpful"), Icon: ThumbsUp },
            { type: "inspiring", label: t("reactions.inspiring"), Icon: Lightbulb },
          ] as const
        ).map(({ type, label, Icon }) => (
          <Button
            key={type}
            type="button"
            variant={selectedReaction === type ? "primary" : "secondary"}
            aria-pressed={selectedReaction === type}
            disabled={pending}
            onClick={() => void react(type)}
            className="min-h-10"
          >
            <Icon aria-hidden className="size-4" />
            {label} · {counts[type]}
          </Button>
        ))}
        <Button variant="secondary" disabled={pending} onClick={toggleComments}>
          <MessageCircle aria-hidden className="size-4" />
          {showComments ? t("hideComments") : t("comments")}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={reportPost}>
          {t("report")}
        </Button>
        {canManage && (
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => setEditing((value) => !value)}
          >
            <Pencil aria-hidden className="size-4" />
            {t("edit")}
          </Button>
        )}
        {(canManage || isAdmin) && (
          <Button type="button" variant="ghost" disabled={pending} onClick={deletePost}>
            <Trash2 aria-hidden className="size-4" />
            {t("delete")}
          </Button>
        )}
      </div>
      {editing && (
        <form onSubmit={updatePost} className="flex flex-col gap-2">
          <input
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            minLength={3}
            maxLength={140}
            required
            className="rounded-input border border-border bg-background p-2"
          />
          <textarea
            value={editContent}
            onChange={(event) => setEditContent(event.target.value)}
            maxLength={5000}
            required
            rows={3}
            className="rounded-input border border-border bg-background p-2"
          />
          <Button disabled={pending}>{t("saveChanges")}</Button>
        </form>
      )}
      {showComments && (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div
              key={comment._id}
              className="flex items-start justify-between gap-2 rounded-input bg-background p-3"
            >
              <p className="text-sm">
                <strong>{comment.author.name}:</strong> {comment.content}
              </p>
              {isAdmin && (
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => deleteComment(comment._id)}
                >
                  {t("delete")}
                </Button>
              )}
            </div>
          ))}
          <form onSubmit={addComment} className="flex flex-col gap-2">
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              maxLength={2000}
              required
              rows={2}
              placeholder={t("commentPlaceholder")}
              className="rounded-input border border-border bg-background p-3"
            />
            <Button disabled={pending}>{t("addComment")}</Button>
          </form>
        </div>
      )}
      {error && (
        <p role="status" className="text-warning text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
