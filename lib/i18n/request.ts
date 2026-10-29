import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { defaultLocale, isLocale } from "./config";

function mergeMessages(
  base: Record<string, unknown>,
  overrides: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    const baseValue = merged[key];
    merged[key] =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
        ? mergeMessages(baseValue as Record<string, unknown>, value as Record<string, unknown>)
        : value;
  }
  return merged;
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const savedLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = isLocale(savedLocale) ? savedLocale : defaultLocale;
  const english = (await import("../../messages/en.json")).default;
  const messages =
    locale === "fr"
      ? mergeMessages(
          english as Record<string, unknown>,
          (await import("../../messages/fr.json")).default as Record<string, unknown>,
        )
      : english;

  return {
    locale,
    messages,
  };
});
