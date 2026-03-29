import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://synapse.app";

const locales = ["en", "ru", "es", "zh", "ar"];

const staticPages = [
  "",
  "/lobby",
  "/categories",
  "/auth/signin",
  "/auth/register",
  "/terms",
  "/privacy",
  "/guide",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of staticPages) {
    for (const locale of locales) {
      entries.push({
        url: `${BASE_URL}/${locale}${page}`,
        lastModified: new Date(),
        changeFrequency: page === "" ? "weekly" : "monthly",
        priority: page === "" ? 1.0 : 0.7,
      });
    }
  }

  return entries;
}
