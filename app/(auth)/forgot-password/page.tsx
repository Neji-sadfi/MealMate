"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black">{t("title")}</h1>
        <p className="text-sm text-muted">{t("intro")}</p>
      </div>

      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError("");
          setSubmitted(false);
          const email = new FormData(event.currentTarget).get("email");
          const response = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          }).catch(() => null);
          if (!response?.ok) {
            const result = (await response?.json().catch(() => null)) as { error?: string } | null;
            const key = result?.error;
            setError(
              t(`errors.${key === "invalidEmail" || key === "rateLimit" ? key : "unknown"}`),
            );
          } else {
            setSubmitted(true);
          }
          setPending(false);
        }}
      >
        <Input name="email" type="email" label={t("email")} required />
        <Button type="submit" fullWidth disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </Button>
      </form>

      {submitted && (
        <p role="status" className="rounded-input bg-success-bg px-4 py-3 text-sm text-success">
          {t("sent")}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-input bg-warning-bg px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <Link href="/login" className="text-center text-sm font-semibold text-primary">
        {t("backToLogin")}
      </Link>
    </div>
  );
}
