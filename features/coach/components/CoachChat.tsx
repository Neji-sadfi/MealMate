"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { MessageSquarePlus, SendHorizontal } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { clearCoachHistoryAction } from "../services/actions";
import type { ChatMessage as Message } from "../services/history";
import { CoachAvatar, type CoachState } from "./CoachAvatar";
import { CoachMarkdown } from "./CoachMarkdown";

const SUGGESTIONS = ["s1", "s2", "s3"] as const;
const MAX_HISTORY = 12;
const CLIENT_TIMEOUT_MS = 45_000;
const ERROR_KEYS = ["rateLimit", "notConfigured", "busy", "unknown"] as const;
type ErrorKey = (typeof ERROR_KEYS)[number];

/** `initialMessages`: the saved conversation, loaded by the page on the server. */
export function CoachChat({ initialMessages = [] }: { initialMessages?: Message[] }) {
  const t = useTranslations("coach");
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [state, setState] = useState<CoachState>("idle");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const busy = state !== "idle";

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, state]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;

    const history: Message[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setState("thinking");

    // Safety net: never stay on "thinking" forever if the server stops answering.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), CLIENT_TIMEOUT_MS);

    try {
      const response = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-MAX_HISTORY) }),
        signal: abort.signal,
      });

      if (!response.ok || !response.body) {
        const key =
          response.status === 429
            ? "rateLimit"
            : response.status === 503
              ? "notConfigured"
              : response.status === 504
                ? "busy"
                : "unknown";
        throw new Error(key);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setState("speaking");
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply.trim()) throw new Error("unknown");
    } catch (err) {
      // Drop the empty assistant bubble and show a readable error.
      setMessages(history);
      const key = abort.signal.aborted ? "busy" : err instanceof Error ? err.message : "unknown";
      setError(ERROR_KEYS.includes(key as ErrorKey) ? key : "unknown");
    } finally {
      clearTimeout(timer);
      setState("idle");
    }
  }

  async function newConversation() {
    if (busy || !window.confirm(t("newConversationConfirm"))) return;
    const { ok } = await clearCoachHistoryAction();
    if (ok) {
      setMessages([]);
      setError(null);
    } else {
      setError("unknown");
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col gap-3">
      <div className="flex items-center gap-3">
        <CoachAvatar state={state} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-black">{t("title")}</h1>
          <p className="text-sm text-muted">{t("subtitle")}</p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => void newConversation()}
            disabled={busy}
            aria-label={t("newConversation")}
            title={t("newConversation")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-tint text-primary disabled:opacity-60"
          >
            <MessageSquarePlus aria-hidden className="size-5" />
          </button>
        )}
      </div>

      <div
        role="log"
        aria-live="polite"
        className="flex flex-1 flex-col gap-3 overflow-y-auto rounded-card bg-surface p-3 shadow-sm"
      >
        <p className="max-w-[85%] self-start rounded-card rounded-tl-sm bg-tint px-4 py-3">
          {t("greeting")}
        </p>

        {messages.map((message, index) =>
          message.role === "user" ? (
            <p
              key={index}
              className="max-w-[85%] self-end rounded-card rounded-tr-sm bg-primary px-4 py-3 whitespace-pre-wrap text-primary-foreground"
            >
              {message.content}
            </p>
          ) : (
            <div
              key={index}
              className="max-w-[85%] self-start rounded-card rounded-tl-sm bg-tint px-4 py-3"
            >
              {message.content ? (
                <CoachMarkdown text={message.content} />
              ) : (
                <span className="text-muted">{t("thinking")}</span>
              )}
            </div>
          ),
        )}

        {error && (
          <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
            {t(`errors.${error as ErrorKey}`)}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map((key) => (
            <Chip key={key} onClick={() => void send(t(`suggestions.${key}`))} disabled={busy}>
              {t(`suggestions.${key}`)}
            </Chip>
          ))}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={1000}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="h-12 min-w-0 flex-1 rounded-input border border-border bg-surface px-4 text-foreground outline-none placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label={t("send")}
          className="flex size-12 shrink-0 items-center justify-center rounded-input bg-primary text-primary-foreground disabled:opacity-60"
        >
          <SendHorizontal aria-hidden className="size-5" />
        </button>
      </form>
      <p className="text-center text-xs text-muted">{t("disclaimer")}</p>
    </div>
  );
}
