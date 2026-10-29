"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Camera, LoaderCircle, Trash2 } from "lucide-react";

const SIZE = 256;

/** Crops the picked photo to a centered square and shrinks it to a small JPEG. */
async function toSquareJpeg(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas");
  context.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    SIZE,
    SIZE,
  );
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("encode"))),
      "image/jpeg",
      0.85,
    ),
  );
}

type Props = { initials: string; avatarUrl: string | null };

/** Profile photo with buttons to change or remove it. Falls back to the initials. */
export function AvatarEditor({ initials, avatarUrl }: Props) {
  const t = useTranslations("pages.profile.avatar");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPending(true);
    setError(false);
    try {
      const body = new FormData();
      body.append("file", await toSquareJpeg(file), "avatar.jpg");
      const response = await fetch("/api/users/me/avatar", { method: "PUT", body });
      if (!response.ok) throw new Error(String(response.status));
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (!window.confirm(t("removeConfirm"))) return;
    setPending(true);
    setError(false);
    const response = await fetch("/api/users/me/avatar", { method: "DELETE" }).catch(() => null);
    if (response?.ok) router.refresh();
    else setError(true);
    setPending(false);
  }

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="relative">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, already resized image
          <img
            src={avatarUrl}
            alt={t("alt")}
            width={64}
            height={64}
            className="size-16 rounded-full bg-primary-foreground object-cover"
          />
        ) : (
          <div
            aria-hidden
            className="flex size-16 items-center justify-center rounded-full bg-primary-foreground text-xl font-extrabold text-primary"
          >
            {initials}
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
          aria-label={avatarUrl ? t("change") : t("add")}
          title={avatarUrl ? t("change") : t("add")}
          className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-primary bg-surface text-primary disabled:opacity-70"
        >
          {pending ? (
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
          ) : (
            <Camera aria-hidden className="size-4" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => void upload(event)}
          className="hidden"
        />
      </div>
      {avatarUrl && !pending && (
        <button
          type="button"
          onClick={() => void remove()}
          aria-label={t("remove")}
          title={t("remove")}
          className="mt-1 flex items-center gap-1 text-xs opacity-80 hover:opacity-100"
        >
          <Trash2 aria-hidden className="size-3" />
          {t("removeShort")}
        </button>
      )}
      {error && (
        <p role="alert" className="max-w-24 text-center text-xs">
          {t("error")}
        </p>
      )}
    </div>
  );
}
