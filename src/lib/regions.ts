export interface Region {
  id: string;
  slug: string;
  icon: string;
}

export const REGIONS: Region[] = [
  { id: "global", slug: "global", icon: "🌍" },
  { id: "europe", slug: "europe", icon: "🇪🇺" },
  { id: "north-america", slug: "north-america", icon: "🌎" },
  { id: "south-america", slug: "south-america", icon: "🌎" },
  { id: "asia", slug: "asia", icon: "🌏" },
  { id: "middle-east", slug: "middle-east", icon: "🕌" },
  { id: "africa", slug: "africa", icon: "🌍" },
  { id: "oceania", slug: "oceania", icon: "🌊" },
  { id: "cis", slug: "cis", icon: "🏔️" },
];

export function getRegionBySlug(slug: string): Region | undefined {
  return REGIONS.find((r) => r.slug === slug);
}
