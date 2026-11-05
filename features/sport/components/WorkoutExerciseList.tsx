"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { exercisePhotosResponseSchema, type ExercisePhoto } from "@/features/sport/schemas";

type Exercise = {
  name: string;
  sets: number;
  repetitions?: number;
  durationSeconds?: number;
  restSeconds: number;
  tip?: string;
};

type Props = {
  exercises: readonly Exercise[];
  variant: "detail" | "preview";
};

export function WorkoutExerciseList({ exercises, variant }: Props) {
  const t = useTranslations("pages.sport.exercisePhotos");
  const [photos, setPhotos] = useState<Record<string, ExercisePhoto | null>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const names = useMemo(
    () => [...new Set(exercises.map((exercise) => exercise.name))],
    [exercises],
  );

  useEffect(() => {
    const controller = new AbortController();
    async function loadPhotos() {
      try {
        const response = await fetch("/api/exercise-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names }),
          signal: controller.signal,
        });
        const result = exercisePhotosResponseSchema.safeParse(await response.json());
        if (!response.ok || !result.success) throw new Error("Exercise photos unavailable");

        setPhotos(Object.fromEntries(result.data.photos.map(({ name, photo }) => [name, photo])));
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("unavailable");
      }
    }

    if (names.length > 0) void loadPhotos();
    return () => controller.abort();
  }, [names]);

  return (
    <>
      {status === "unavailable" && (
        <p role="status" className="mb-3 rounded-input bg-surface px-3 py-2 text-xs text-muted">
          {t("photosUnavailable")}
        </p>
      )}
      <ol className={variant === "preview" ? "mt-3 flex flex-col gap-2" : "space-y-2 text-sm"}>
        {exercises.map((exercise, index) => {
          const photo = photos[exercise.name];
          const hasImage = photo && !failedImages.has(exercise.name);

          return (
            <li
              key={`${exercise.name}-${index}`}
              className={
                variant === "preview"
                  ? "rounded-xl border border-border/60 p-3"
                  : "rounded-xl bg-surface p-3"
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-background text-center text-[10px] leading-tight text-muted">
                  {hasImage ? (
                    <a
                      href={photo.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t("viewSource", { name: exercise.name })}
                    >
                      <Image
                        src={photo.imageUrl}
                        alt={exercise.name}
                        width={80}
                        height={80}
                        unoptimized
                        className="size-20 object-cover"
                        onError={() =>
                          setFailedImages((current) => new Set(current).add(exercise.name))
                        }
                      />
                    </a>
                  ) : (
                    <span className="px-1">
                      {status === "loading" ? t("searching") : t("photoUnavailable")}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">
                      {variant === "preview" ? `${index + 1}. ` : ""}
                      {exercise.name}
                    </p>
                    <span className="shrink-0 text-right text-xs text-muted">
                      {exercise.sets} ×{" "}
                      {exercise.repetitions ?? `${exercise.durationSeconds ?? 0}s`}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {variant === "preview" ? `${t("rest")}: ` : ""}
                    {variant === "detail" ? `${exercise.sets} ${t("sets")} · ` : ""}
                    {exercise.repetitions ? `${exercise.repetitions} ${t("repetitions")}` : ""}
                    {exercise.durationSeconds
                      ? `${exercise.repetitions ? " · " : ""}${exercise.durationSeconds}s`
                      : ""}
                    {variant === "detail" ? ` · ${exercise.restSeconds}s ${t("rest")}` : ""}
                    {variant === "preview" ? `${exercise.restSeconds}s` : ""}
                  </p>
                  {exercise.tip && (
                    <p className="mt-2 text-sm leading-relaxed">
                      {variant === "preview" && (
                        <span className="font-semibold text-primary">{t("tip")}: </span>
                      )}
                      {exercise.tip}
                    </p>
                  )}
                  {photo && (
                    <p className="mt-1 text-[10px] text-muted">
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {t("photoCredit", { author: photo.author })}
                      </a>
                      {" · "}
                      <a
                        href={photo.licenseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-2"
                      >
                        {photo.licenseName}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
