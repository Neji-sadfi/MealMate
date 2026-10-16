// Locales supported by the app. Only English is active for now.
// To add French later: add "fr" here, create messages/fr.json and pick the
// locale in request.ts (cookie, header or user preference).
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";
