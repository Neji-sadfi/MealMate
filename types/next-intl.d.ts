import type messages from "@/messages/en.json";
import type { Locale } from "@/lib/i18n/config";

// Gives type-safe translation keys: t("auth.login.title") is checked at compile time.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
