import { describe, it, expect } from "vitest";
import { REGIONS, getRegionBySlug } from "@/lib/regions";

describe("REGIONS", () => {
  it("has 9 regions", () => {
    expect(REGIONS).toHaveLength(9);
  });

  it("includes global region", () => {
    const global = REGIONS.find((r) => r.slug === "global");
    expect(global).toBeDefined();
    expect(global!.icon).toBe("🌍");
  });

  it("all regions have required fields", () => {
    for (const region of REGIONS) {
      expect(region.id).toBeTruthy();
      expect(region.slug).toBeTruthy();
      expect(region.icon).toBeTruthy();
    }
  });

  it("all slugs are unique", () => {
    const slugs = REGIONS.map((r) => r.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("includes expected regions", () => {
    const slugs = REGIONS.map((r) => r.slug);
    expect(slugs).toContain("europe");
    expect(slugs).toContain("north-america");
    expect(slugs).toContain("asia");
    expect(slugs).toContain("cis");
    expect(slugs).toContain("middle-east");
  });
});

describe("getRegionBySlug", () => {
  it("finds existing region", () => {
    const region = getRegionBySlug("europe");
    expect(region).toBeDefined();
    expect(region!.slug).toBe("europe");
    expect(region!.icon).toBe("🇪🇺");
  });

  it("returns undefined for unknown slug", () => {
    expect(getRegionBySlug("antarc tica")).toBeUndefined();
    expect(getRegionBySlug("")).toBeUndefined();
  });

  it("finds global region", () => {
    const region = getRegionBySlug("global");
    expect(region).toBeDefined();
  });
});
