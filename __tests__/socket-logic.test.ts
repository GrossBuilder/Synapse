import { describe, it, expect } from "vitest";

// ==================== Тестируем логику матчинга и валидации ====================
// (Эти функции реплицируют серверную логику из socket.ts для unit-тестирования)

// --- Input Validation (реплика из socket.ts) ---

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ROOM_NAME_LENGTH = 50;
const MAX_CATEGORY_LENGTH = 100;
const MAX_TAGS = 10;
const MAX_TAG_LENGTH = 50;

function sanitizeString(str: unknown, maxLength: number): string {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLength);
}

function validateCategorySlug(slug: unknown): string | null {
  if (typeof slug !== "string" || slug.length === 0 || slug.length > MAX_CATEGORY_LENGTH) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) return null;
  return slug;
}

function sanitizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .filter((t): t is string => typeof t === "string" && t.length > 0)
    .slice(0, MAX_TAGS)
    .map((t) => t.trim().slice(0, MAX_TAG_LENGTH));
}

// --- Trust Score (реплика из socket.ts) ---

type TrustPool = "trusted" | "regular" | "probation";

const TRUST_DEFAULTS = {
  defaultScore: 50,
  trustedThreshold: 70,
  probationThreshold: 30,
  rapidSkipThreshold: 5,
  rapidSkipLimit: 3,
  ghostPenaltyMs: 10 * 60 * 1000,
};

function scoreToPool(score: number): TrustPool {
  if (score >= TRUST_DEFAULTS.trustedThreshold) return "trusted";
  if (score >= TRUST_DEFAULTS.probationThreshold) return "regular";
  return "probation";
}

// --- Shadow Pool Logic (реплика из socket.ts) ---

interface QueueEntry {
  socketId: string;
  userId: string;
  categorySlug: string;
  subcategorySlugs: string[];
  tags: string[];
  regionSlug: string;
  joinedAt: number;
  trustPool: TrustPool;
  queuePriority: number;
  trustBadge: string;
  trustScore: number;
  userName: string;
  userImage: string | null;
  plan: string;
}

function canMatch(entryPool: TrustPool, candidatePool: TrustPool): boolean {
  if (entryPool === "probation") {
    return candidatePool === "probation";
  }
  return candidatePool !== "probation";
}

function calculateMatchScore(entry: QueueEntry, candidate: QueueEntry): number {
  let score = 1;
  const commonSubs = entry.subcategorySlugs.filter((s) =>
    candidate.subcategorySlugs.includes(s)
  );
  score += commonSubs.length * 2;
  const commonTags = entry.tags.filter((t) =>
    candidate.tags.map((ct) => ct.toLowerCase()).includes(t.toLowerCase())
  );
  score += commonTags.length * 3;
  if (
    entry.regionSlug !== "global" &&
    candidate.regionSlug !== "global" &&
    entry.regionSlug === candidate.regionSlug
  ) {
    score += 4;
  }
  const waitTime = Date.now() - candidate.joinedAt;
  if (waitTime > 10000) score += 1;
  if (waitTime > 30000) score += 2;
  if (candidate.trustPool === "trusted") score += 3;
  if (entry.trustPool === "trusted" && candidate.trustPool === "trusted") score += 2;
  score += candidate.queuePriority;
  score += entry.queuePriority;
  return score;
}

function makeEntry(overrides: Partial<QueueEntry> = {}): QueueEntry {
  return {
    socketId: "socket-1",
    userId: "user-1",
    userName: "Test",
    userImage: null,
    categorySlug: "tech",
    subcategorySlugs: ["web", "ai"],
    tags: ["react", "nextjs"],
    regionSlug: "europe",
    joinedAt: Date.now(),
    trustPool: "regular",
    trustScore: 50,
    trustBadge: "regular",
    queuePriority: 1,
    plan: "free",
    ...overrides,
  };
}

// ==================== ТЕСТЫ ====================

describe("sanitizeString", () => {
  it("returns empty for non-string inputs", () => {
    expect(sanitizeString(null, 100)).toBe("");
    expect(sanitizeString(undefined, 100)).toBe("");
    expect(sanitizeString(123, 100)).toBe("");
    expect(sanitizeString({}, 100)).toBe("");
    expect(sanitizeString([], 100)).toBe("");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ", 100)).toBe("hello");
  });

  it("truncates to maxLength", () => {
    expect(sanitizeString("abcdefghij", 5)).toBe("abcde");
  });

  it("handles empty string", () => {
    expect(sanitizeString("", 100)).toBe("");
  });

  it("handles message length limit", () => {
    const longMessage = "a".repeat(3000);
    expect(sanitizeString(longMessage, MAX_MESSAGE_LENGTH).length).toBe(MAX_MESSAGE_LENGTH);
  });

  it("handles room name length limit", () => {
    const longName = "a".repeat(100);
    expect(sanitizeString(longName, MAX_ROOM_NAME_LENGTH).length).toBe(MAX_ROOM_NAME_LENGTH);
  });
});

describe("validateCategorySlug", () => {
  it("accepts valid slugs", () => {
    expect(validateCategorySlug("tech")).toBe("tech");
    expect(validateCategorySlug("web-dev")).toBe("web-dev");
    expect(validateCategorySlug("ai_ml")).toBe("ai_ml");
    expect(validateCategorySlug("Category123")).toBe("Category123");
  });

  it("rejects empty or non-string", () => {
    expect(validateCategorySlug("")).toBeNull();
    expect(validateCategorySlug(null)).toBeNull();
    expect(validateCategorySlug(undefined)).toBeNull();
    expect(validateCategorySlug(123)).toBeNull();
  });

  it("rejects XSS/injection attempts", () => {
    expect(validateCategorySlug("<script>alert('xss')</script>")).toBeNull();
    expect(validateCategorySlug("tech'; DROP TABLE users;")).toBeNull();
    expect(validateCategorySlug("tech/../../etc/passwd")).toBeNull();
    expect(validateCategorySlug("tech%20OR%201=1")).toBeNull();
  });

  it("rejects special characters", () => {
    expect(validateCategorySlug("hello world")).toBeNull();
    expect(validateCategorySlug("cat.slug")).toBeNull();
    expect(validateCategorySlug("cat@slug")).toBeNull();
  });

  it("rejects too-long slugs", () => {
    const longSlug = "a".repeat(101);
    expect(validateCategorySlug(longSlug)).toBeNull();
  });
});

describe("sanitizeTags", () => {
  it("returns empty array for non-array", () => {
    expect(sanitizeTags(null)).toEqual([]);
    expect(sanitizeTags("string")).toEqual([]);
    expect(sanitizeTags(123)).toEqual([]);
  });

  it("filters non-string elements", () => {
    expect(sanitizeTags([1, null, "valid", undefined, "also-valid"])).toEqual(["valid", "also-valid"]);
  });

  it("limits to MAX_TAGS", () => {
    const tags = Array.from({ length: 20 }, (_, i) => `tag-${i}`);
    expect(sanitizeTags(tags).length).toBe(MAX_TAGS);
  });

  it("trims and truncates each tag", () => {
    const longTag = "a".repeat(100);
    const result = sanitizeTags(["  hello  ", longTag]);
    expect(result[0]).toBe("hello");
    expect(result[1].length).toBe(MAX_TAG_LENGTH);
  });

  it("filters empty strings", () => {
    expect(sanitizeTags(["", "valid", ""])).toEqual(["valid"]);
  });
});

describe("Shadow Pool Matching", () => {
  it("probation matches only with probation", () => {
    expect(canMatch("probation", "probation")).toBe(true);
    expect(canMatch("probation", "regular")).toBe(false);
    expect(canMatch("probation", "trusted")).toBe(false);
  });

  it("regular does not match with probation", () => {
    expect(canMatch("regular", "probation")).toBe(false);
    expect(canMatch("regular", "regular")).toBe(true);
    expect(canMatch("regular", "trusted")).toBe(true);
  });

  it("trusted does not match with probation", () => {
    expect(canMatch("trusted", "probation")).toBe(false);
    expect(canMatch("trusted", "regular")).toBe(true);
    expect(canMatch("trusted", "trusted")).toBe(true);
  });
});

describe("Match Score Calculation", () => {
  it("gives base score of 1 for same category", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0 });
    expect(calculateMatchScore(e1, e2)).toBe(1);
  });

  it("adds +2 per subcategory match", () => {
    const e1 = makeEntry({ subcategorySlugs: ["web", "ai"], tags: [], regionSlug: "global", queuePriority: 0 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: ["web", "ai"], tags: [], regionSlug: "global", queuePriority: 0 });
    // 1 base + 2*2 subcats = 5
    expect(calculateMatchScore(e1, e2)).toBe(5);
  });

  it("adds +3 per tag match (case-insensitive)", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: ["React", "NextJS"], regionSlug: "global", queuePriority: 0 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: ["react", "nextjs"], regionSlug: "global", queuePriority: 0 });
    // 1 base + 2*3 tags = 7
    expect(calculateMatchScore(e1, e2)).toBe(7);
  });

  it("adds +4 for same non-global region", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "europe", queuePriority: 0 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "europe", queuePriority: 0 });
    // 1 base + 4 region = 5
    expect(calculateMatchScore(e1, e2)).toBe(5);
  });

  it("no region bonus when one is global", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "europe", queuePriority: 0 });
    expect(calculateMatchScore(e1, e2)).toBe(1);
  });

  it("adds trust bonus for trusted candidates", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0, trustPool: "regular" });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0, trustPool: "trusted" });
    // 1 base + 3 trusted = 4
    expect(calculateMatchScore(e1, e2)).toBe(4);
  });

  it("adds extra bonus for trusted-trusted pair", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0, trustPool: "trusted" });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 0, trustPool: "trusted" });
    // 1 base + 3 trusted_candidate + 2 trusted_pair = 6
    expect(calculateMatchScore(e1, e2)).toBe(6);
  });

  it("adds queue priority from both sides", () => {
    const e1 = makeEntry({ subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 3 });
    const e2 = makeEntry({ socketId: "s2", userId: "u2", subcategorySlugs: [], tags: [], regionSlug: "global", queuePriority: 8 });
    // 1 base + 3 + 8 = 12
    expect(calculateMatchScore(e1, e2)).toBe(12);
  });
});

describe("scoreToPool (socket-side)", () => {
  it("maps scores to correct pools", () => {
    expect(scoreToPool(100)).toBe("trusted");
    expect(scoreToPool(70)).toBe("trusted");
    expect(scoreToPool(69)).toBe("regular");
    expect(scoreToPool(30)).toBe("regular");
    expect(scoreToPool(29)).toBe("probation");
    expect(scoreToPool(0)).toBe("probation");
  });
});

// ==================== Subscription/Limits Logic ====================

describe("Subscription Daily Limits", () => {
  const PLAN_CHAT_LIMITS: Record<string, number> = {
    free: 15,
    plus: Infinity,
    pro: Infinity,
  };

  const PLAN_REMATCH_LIMITS: Record<string, number> = {
    free: 1,
    plus: 5,
    pro: Infinity,
  };

  it("free user limit is 15 chats", () => {
    expect(PLAN_CHAT_LIMITS.free).toBe(15);
  });

  it("paid users have unlimited chats", () => {
    expect(PLAN_CHAT_LIMITS.plus).toBe(Infinity);
    expect(PLAN_CHAT_LIMITS.pro).toBe(Infinity);
  });

  it("rematch limits are tiered", () => {
    expect(PLAN_REMATCH_LIMITS.free).toBe(1);
    expect(PLAN_REMATCH_LIMITS.plus).toBe(5);
    expect(PLAN_REMATCH_LIMITS.pro).toBe(Infinity);
  });
});
