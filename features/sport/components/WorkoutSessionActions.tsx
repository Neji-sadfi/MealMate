"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import type { WorkoutStatus } from "@/models/enums";

/** Lets the user mark a session as done or skipped, reopen it or delete it. */
export function WorkoutSessionActions({
  sessionId,
  status,
}: {
  sessionId: string;
  status: WorkoutStatus;
}) {
  const router = useRouter();
  const t = useTranslations("pages.workoutSession.actions");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function setStatus(next: WorkoutStatus) {
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("deleteConfirm"))) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}`, { method: "DELETE" });
      if (!response.ok) {
        setError(t("error"));
        return;
      }
      router.push("/sport");
      router.refresh();
    } catch {
      setError(t("error"));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "planned" ? (
          <>
            <Button disabled={pending} onClick={() => void setStatus("done")}>
              {t("done")}
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => void setStatus("skipped")}
            >
              {t("skip")}
            </Button>
          </>
        ) : (
          <Button variant="secondary" disabled={pending} onClick={() => void setStatus("planned")}>
            {t("reopen")}
          </Button>
        )}
        <Button variant="ghost" disabled={pending} onClick={() => void remove()}>
          {t("delete")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-warning">
          {error}
        </p>
      )}
    </div>
  );
}
