import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "es", "zh", "ar"],
  defaultLocale: "en",
  localeDetection: true,
  localeCookie: false,
});
