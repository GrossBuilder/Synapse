import { describe, it, expect } from "vitest";
import {
  PLAN_LIMITS,
  PRICING,
  BOOST_PRICING,
  PRICING_INFO,
  getPlanLimits,
  canStartChat,
  canRematch,
  getQueuePriorityBonus,
} from "@/lib/subscription";
import type { ActiveBoost, SubscriptionPlan } from "@/types";

// ==================== PLAN_LIMITS ====================

describe("PLAN_LIMITS", () => {
  it("free plan has correct limits", () => {
    const free = PLAN_LIMITS.free;
    expect(free.chatsPerDay).toBe(15);
    expect(free.queuePriority).toBe(1);
    expect(free.rematchPerDay).toBe(1);
    expect(free.allRegions).toBe(false);
    expect(free.invisibleSkip).toBe(false);
    expect(free.createGroupRooms).toBe(false);
    expect(free.chatAnalytics).toBe(false);
    expect(free.noAds).toBe(false);
  });

  it("plus plan unlocks key features", () => {
    const plus = PLAN_LIMITS.plus;
    expect(plus.chatsPerDay).toBe(Infinity);
    expect(plus.queuePriority).toBe(2);
    expect(plus.rematchPerDay).toBe(5);
    expect(plus.allRegions).toBe(true);
    expect(plus.invisibleSkip).toBe(true);
    expect(plus.noAds).toBe(true);
    expect(plus.createGroupRooms).toBe(false); // Only Pro
  });

  it("pro plan has all features", () => {
    const pro = PLAN_LIMITS.pro;
    expect(pro.chatsPerDay).toBe(Infinity);
    expect(pro.queuePriority).toBe(3);
    expect(pro.rematchPerDay).toBe(Infinity);
    expect(pro.allRegions).toBe(true);
    expect(pro.createGroupRooms).toBe(true);
    expect(pro.chatAnalytics).toBe(true);
  });

  it("plans are progressively better", () => {
    expect(PLAN_LIMITS.plus.queuePriority).toBeGreaterThan(PLAN_LIMITS.free.queuePriority);
    expect(PLAN_LIMITS.pro.queuePriority).toBeGreaterThan(PLAN_LIMITS.plus.queuePriority);
  });
});

// ==================== PRICING ====================

describe("PRICING", () => {
  it("free plan is free", () => {
    expect(PRICING.free).toBe(0);
  });

  it("plus is cheaper than pro", () => {
    expect(PRICING.plus).toBeLessThan(PRICING.pro);
    expect(PRICING.plus).toBe(4.99);
    expect(PRICING.pro).toBe(9.99);
  });

  it("all prices are non-negative", () => {
    for (const plan of Object.keys(PRICING) as SubscriptionPlan[]) {
      expect(PRICING[plan]).toBeGreaterThanOrEqual(0);
    }
  });
});

// ==================== BOOST_PRICING ====================

describe("BOOST_PRICING", () => {
  it("queue boost is 30 minutes", () => {
    expect(BOOST_PRICING.queue.durationMs).toBe(30 * 60 * 1000);
    expect(BOOST_PRICING.queue.price).toBe(0.99);
  });

  it("region boost is 24 hours", () => {
    expect(BOOST_PRICING.region.durationMs).toBe(24 * 60 * 60 * 1000);
  });

  it("spotlight boost is 24 hours", () => {
    expect(BOOST_PRICING.spotlight.durationMs).toBe(24 * 60 * 60 * 1000);
  });

  it("all boosts have labels", () => {
    expect(BOOST_PRICING.queue.label).toBeTruthy();
    expect(BOOST_PRICING.region.label).toBeTruthy();
    expect(BOOST_PRICING.spotlight.label).toBeTruthy();
  });
});

// ==================== getPlanLimits ====================

describe("getPlanLimits", () => {
  it("returns limits for each plan", () => {
    expect(getPlanLimits("free")).toEqual(PLAN_LIMITS.free);
    expect(getPlanLimits("plus")).toEqual(PLAN_LIMITS.plus);
    expect(getPlanLimits("pro")).toEqual(PLAN_LIMITS.pro);
  });
});

// ==================== canStartChat ====================

describe("canStartChat", () => {
  it("allows free user under limit", () => {
    const result = canStartChat("free", 0);
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(0);
    expect(result.limit).toBe(15);
  });

  it("blocks free user at limit", () => {
    const result = canStartChat("free", 15);
    expect(result.allowed).toBe(false);
  });

  it("allows free user at 14 chats", () => {
    const result = canStartChat("free", 14);
    expect(result.allowed).toBe(true);
  });

  it("always allows plus users", () => {
    const result = canStartChat("plus", 1000);
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
  });

  it("always allows pro users", () => {
    const result = canStartChat("pro", 999999);
    expect(result.allowed).toBe(true);
  });
});

// ==================== canRematch ====================

describe("canRematch", () => {
  it("allows free user 1 rematch", () => {
    expect(canRematch("free", 0).allowed).toBe(true);
    expect(canRematch("free", 1).allowed).toBe(false);
  });

  it("allows plus user 5 rematches", () => {
    expect(canRematch("plus", 4).allowed).toBe(true);
    expect(canRematch("plus", 5).allowed).toBe(false);
  });

  it("allows pro unlimited rematches", () => {
    expect(canRematch("pro", 100).allowed).toBe(true);
  });
});

// ==================== getQueuePriorityBonus ====================

describe("getQueuePriorityBonus", () => {
  it("returns base priority without boosts", () => {
    expect(getQueuePriorityBonus("free", [])).toBe(1);
    expect(getQueuePriorityBonus("plus", [])).toBe(2);
    expect(getQueuePriorityBonus("pro", [])).toBe(3);
  });

  it("adds +5 with active queue boost", () => {
    const boosts: ActiveBoost[] = [
      { userId: "u1", type: "queue", activatedAt: Date.now(), expiresAt: Date.now() + 60000 },
    ];
    expect(getQueuePriorityBonus("free", boosts)).toBe(6); // 1 + 5
    expect(getQueuePriorityBonus("pro", boosts)).toBe(8);  // 3 + 5
  });

  it("ignores expired queue boost", () => {
    const boosts: ActiveBoost[] = [
      { userId: "u1", type: "queue", activatedAt: Date.now() - 120000, expiresAt: Date.now() - 1000 },
    ];
    expect(getQueuePriorityBonus("free", boosts)).toBe(1);
  });

  it("ignores non-queue boosts", () => {
    const boosts: ActiveBoost[] = [
      { userId: "u1", type: "region", activatedAt: Date.now(), expiresAt: Date.now() + 60000 },
      { userId: "u1", type: "spotlight", activatedAt: Date.now(), expiresAt: Date.now() + 60000 },
    ];
    expect(getQueuePriorityBonus("free", boosts)).toBe(1);
  });
});

// ==================== PRICING_INFO ====================

describe("PRICING_INFO", () => {
  it("has info for all 3 plans", () => {
    expect(PRICING_INFO).toHaveLength(3);
    const plans = PRICING_INFO.map((p) => p.plan);
    expect(plans).toContain("free");
    expect(plans).toContain("plus");
    expect(plans).toContain("pro");
  });

  it("prices match PRICING config", () => {
    for (const info of PRICING_INFO) {
      expect(info.price).toBe(PRICING[info.plan]);
    }
  });

  it("all plans have features listed", () => {
    for (const info of PRICING_INFO) {
      expect(info.features.length).toBeGreaterThan(0);
    }
  });
});
