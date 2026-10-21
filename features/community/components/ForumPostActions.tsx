"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

type Comment = {
  _id: string;
  content: string;
  author: { name: string };
};

export function ForumPostActions({
  postId,
  title,
  content,
  likesCount,
  isLiked,
  canManage,
  isAdmin,
}: {
  postId: string;
  title: string;
  content: string;
  likesCount: number;
  isLiked: boolean;
  canManage: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(isLiked);
  const [likes, setLikes] = useState(likesCount);
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
        setError(
          !Array.isArray(result)
            ? (result.error ?? "Could not load comments.")
            : "Could not load comments.",
        );
        return;
      }
      setComments(result);
    } catch {
      setError("Could not reach the server. Please try again.");
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next) await loadComments();
  }

  async function likePost() {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}/likes`, { method: "POST" });
      const result = (await response.json()) as { liked?: boolean; error?: string };
      if (!response.ok || typeof result.liked !== "boolean") {
        setError(result.error ?? "Could not update your like.");
        return;
      }
      setLiked(result.liked);
      setLikes((count) => count + (result.liked ? 1 : -1));
    } catch {
      setError("Could not reach the server. Please try again.");
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
        setError(
          "error" in result
            ? (result.error ?? "Could not add your comment.")
            : "Could not add your comment.",
        );
        return;
      }
      setComments((current) => [...current, result]);
      setCommentText("");
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
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
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not report this post.");
        return;
      }
      setError("Post reported to the moderators.");
    } catch {
      setError("Could not reach the server. Please try again.");
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
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not update this post.");
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function deletePost() {
    if (!window.confirm("Delete this post and its comments?")) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/forum/posts/${postId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not delete this post.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  async function deleteComment(commentId: string) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/comments/${commentId}`, { method: "DELETE" });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(result.error ?? "Could not delete this comment.");
        return;
      }
      setComments((current) => current.filter((comment) => comment._id !== commentId));
      router.refresh();
    } catch {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" disabled={pending} onClick={likePost}>
          {liked ? "Unlike" : "Like"} · {likes}
        </Button>
        <Button variant="secondary" disabled={pending} onClick={toggleComments}>
          {showComments ? "Hide comments" : "Comments"}
        </Button>
        <Button variant="ghost" disabled={pending} onClick={reportPost}>
          Report
        </Button>
        {canManage && (
          <Button variant="ghost" disabled={pending} onClick={() => setEditing((value) => !value)}>
            Edit
          </Button>
        )}
        {(canManage || isAdmin) && (
          <Button variant="ghost" disabled={pending} onClick={deletePost}>
            Delete
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
          <Button disabled={pending}>Save changes</Button>
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
                  Delete
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
              placeholder="Write a comment..."
              className="rounded-input border border-border bg-background p-3"
            />
            <Button disabled={pending}>Add comment</Button>
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
