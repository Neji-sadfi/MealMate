"use server";

import { cookies } from "next/headers";
import { isLocale } from "@/lib/i18n/config";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) throw new Error("Unsupported locale.");
  const cookieStore = await cookies();
  cookieStore.set("NEXT_LOCALE", locale, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
