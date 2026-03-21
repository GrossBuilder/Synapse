import { describe, it, expect } from "vitest";
import {
  calculateFactors,
  calculateScore,
  scoreToPool,
  scoreToBadge,
  recalculateTrustScore,
  createDefaultTrustScore,
  handleRapidSkip,
  isUnderPenalty,
  getEffectivePool,
  getMatchingBonus,
  TRUST_CONFIG,
} from "@/lib/trust-score";
import type { SessionBehavior } from "@/types";

// ==================== HELPERS ====================

function makeBehavior(overrides: Partial<SessionBehavior> = {}): SessionBehavior {
  return {
    userId: "user-1",
    sessionId: "session-1",
    duration: 300, // 5 мин — «хорошая» сессия
    wasSkippedByPartner: false,
    skippedPartner: false,
    cameraOnPercent: 90,
    messagesSent: 5,
    reportFiled: false,
    timestamp: Date.now(),
    ...overrides,
  };
}

// ==================== scoreToPool ====================

describe("scoreToPool", () => {
  it("returns 'trusted' for score >= 70", () => {
    expect(scoreToPool(70)).toBe("trusted");
    expect(scoreToPool(100)).toBe("trusted");
    expect(scoreToPool(85)).toBe("trusted");
  });

  it("returns 'regular' for score 30-69", () => {
    expect(scoreToPool(30)).toBe("regular");
    expect(scoreToPool(50)).toBe("regular");
    expect(scoreToPool(69)).toBe("regular");
  });

  it("returns 'probation' for score < 30", () => {
    expect(scoreToPool(0)).toBe("probation");
    expect(scoreToPool(29)).toBe("probation");
    expect(scoreToPool(15)).toBe("probation");
  });
});

// ==================== scoreToBadge ====================

describe("scoreToBadge", () => {
  it("returns 'trusted' for high scores", () => {
    expect(scoreToBadge(70)).toBe("trusted");
    expect(scoreToBadge(100)).toBe("trusted");
  });

  it("returns 'regular' for mid scores", () => {
    expect(scoreToBadge(50)).toBe("regular");
    expect(scoreToBadge(30)).toBe("regular");
  });

  it("returns 'low' for low scores", () => {
    expect(scoreToBadge(0)).toBe("low");
    expect(scoreToBadge(29)).toBe("low");
  });
});

// ==================== calculateFactors ====================

describe("calculateFactors", () => {
  it("returns half-weights for empty behaviors", () => {
    const factors = calculateFactors([], 0);
    expect(factors.sessionDuration).toBe(TRUST_CONFIG.weights.sessionDuration * 0.5);
    expect(factors.skipRate).toBe(TRUST_CONFIG.weights.skipRate * 0.5);
    expect(factors.reportCleanness).toBe(TRUST_CONFIG.weights.reportCleanness);
    expect(factors.cameraUsage).toBe(TRUST_CONFIG.weights.cameraUsage * 0.5);
    expect(factors.chatActivity).toBe(TRUST_CONFIG.weights.chatActivity * 0.5);
  });

  it("gives max sessionDuration for long sessions", () => {
    const behaviors = [makeBehavior({ duration: 300 })]; // 5 мин > 3 мин threshold
    const factors = calculateFactors(behaviors, 0);
    expect(factors.sessionDuration).toBe(TRUST_CONFIG.weights.sessionDuration); // 30
  });

  it("gives lower sessionDuration for short sessions", () => {
    const behaviors = [makeBehavior({ duration: 30 })]; // 30 сек
    const factors = calculateFactors(behaviors, 0);
    // 30/180 = 0.167 * 30 ≈ 5
    expect(factors.sessionDuration).toBeLessThan(TRUST_CONFIG.weights.sessionDuration);
    expect(factors.sessionDuration).toBeGreaterThan(0);
  });

  it("penalizes high skip rates", () => {
    const behaviors = [
      makeBehavior({ wasSkippedByPartner: true }),
      makeBehavior({ wasSkippedByPartner: true }),
      makeBehavior({ wasSkippedByPartner: false }),
    ];
    const factors = calculateFactors(behaviors, 0);
    // 2/3 скипнуты → (1 - 0.67) * 25 ≈ 8.3
    expect(factors.skipRate).toBeLessThan(TRUST_CONFIG.weights.skipRate * 0.5);
  });

  it("gives max skipRate when never skipped", () => {
    const behaviors = [
      makeBehavior({ wasSkippedByPartner: false }),
      makeBehavior({ wasSkippedByPartner: false }),
    ];
    const factors = calculateFactors(behaviors, 0);
    expect(factors.skipRate).toBe(TRUST_CONFIG.weights.skipRate); // 25
  });

  it("penalizes reports (0 reports → 20, 4+ → 0)", () => {
    expect(calculateFactors([], 0).reportCleanness).toBe(20);
    expect(calculateFactors([], 1).reportCleanness).toBe(15);
    expect(calculateFactors([], 2).reportCleanness).toBe(10);
    expect(calculateFactors([], 3).reportCleanness).toBe(5);
    expect(calculateFactors([], 4).reportCleanness).toBe(0);
    expect(calculateFactors([], 10).reportCleanness).toBe(0); // capped at 4
  });

  it("gives max cameraUsage for high camera percent", () => {
    const behaviors = [makeBehavior({ cameraOnPercent: 90 })];
    const factors = calculateFactors(behaviors, 0);
    expect(factors.cameraUsage).toBe(TRUST_CONFIG.weights.cameraUsage); // 15
  });

  it("gives max chatActivity for active chatters", () => {
    const behaviors = [makeBehavior({ messagesSent: 10 })];
    const factors = calculateFactors(behaviors, 0);
    expect(factors.chatActivity).toBe(TRUST_CONFIG.weights.chatActivity); // 10
  });

  it("limits history window", () => {
    // Создаём 100 behaviors, но calculateFactors берёт только historyWindow (50)
    const behaviors = Array.from({ length: 100 }, (_, i) =>
      makeBehavior({ timestamp: i, duration: 300 })
    );
    const factors = calculateFactors(behaviors, 0);
    expect(factors.sessionDuration).toBe(TRUST_CONFIG.weights.sessionDuration);
  });
});

// ==================== calculateScore ====================

describe("calculateScore", () => {
  it("sums all factors and clamps to 0-100", () => {
    const factors = {
      sessionDuration: 30,
      skipRate: 25,
      reportCleanness: 20,
      cameraUsage: 15,
      chatActivity: 10,
    };
    expect(calculateScore(factors)).toBe(100);
  });

  it("returns 0 for all-zero factors", () => {
    const factors = {
      sessionDuration: 0,
      skipRate: 0,
      reportCleanness: 0,
      cameraUsage: 0,
      chatActivity: 0,
    };
    expect(calculateScore(factors)).toBe(0);
  });

  it("clamps to max 100", () => {
    const factors = {
      sessionDuration: 50,
      skipRate: 50,
      reportCleanness: 50,
      cameraUsage: 50,
      chatActivity: 50,
    };
    expect(calculateScore(factors)).toBe(100);
  });
});

// ==================== createDefaultTrustScore ====================

describe("createDefaultTrustScore", () => {
  it("creates score with default value 50", () => {
    const ts = createDefaultTrustScore("user-1");
    expect(ts.userId).toBe("user-1");
    expect(ts.score).toBe(50);
    expect(ts.pool).toBe("regular");
    expect(ts.badge).toBe("regular");
    expect(ts.rapidSkipStreak).toBe(0);
    expect(ts.penaltyUntil).toBeNull();
  });

  it("has partial factors (half-weights)", () => {
    const ts = createDefaultTrustScore("user-1");
    expect(ts.factors.sessionDuration).toBe(TRUST_CONFIG.weights.sessionDuration * 0.5);
    expect(ts.factors.reportCleanness).toBe(TRUST_CONFIG.weights.reportCleanness);
  });
});

// ==================== recalculateTrustScore ====================

describe("recalculateTrustScore", () => {
  it("recalculates from behaviors", () => {
    const behaviors = [
      makeBehavior({ duration: 300, cameraOnPercent: 90, messagesSent: 8 }),
      makeBehavior({ duration: 600, cameraOnPercent: 100, messagesSent: 12 }),
    ];
    const ts = recalculateTrustScore("user-1", behaviors, 0);
    expect(ts.score).toBeGreaterThan(70); // Good behaviors → trusted
    expect(ts.pool).toBe("trusted");
  });

  it("gives low score for bad behaviors", () => {
    const behaviors = [
      makeBehavior({ duration: 3, wasSkippedByPartner: true, cameraOnPercent: 0, messagesSent: 0 }),
      makeBehavior({ duration: 5, wasSkippedByPartner: true, cameraOnPercent: 10, messagesSent: 0 }),
    ];
    const ts = recalculateTrustScore("user-1", behaviors, 4);
    expect(ts.score).toBeLessThan(30);
    expect(ts.pool).toBe("probation");
  });

  it("preserves existing streak/penalty", () => {
    const ts = recalculateTrustScore("user-1", [], 0, {
      rapidSkipStreak: 2,
      penaltyUntil: Date.now() + 60000,
    });
    expect(ts.rapidSkipStreak).toBe(2);
    expect(ts.penaltyUntil).not.toBeNull();
  });
});

// ==================== handleRapidSkip ====================

describe("handleRapidSkip", () => {
  it("resets streak for normal skip (>= 5 sec)", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.rapidSkipStreak = 2;
    const updated = handleRapidSkip(ts, 10);
    expect(updated.rapidSkipStreak).toBe(0);
  });

  it("increments streak for rapid skip (< 5 sec)", () => {
    const ts = createDefaultTrustScore("user-1");
    const updated = handleRapidSkip(ts, 2);
    expect(updated.rapidSkipStreak).toBe(1);
  });

  it("triggers Ghost Skip penalty at limit (3 rapid skips)", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.rapidSkipStreak = 2; // Already 2 rapid skips

    const updated = handleRapidSkip(ts, 1); // 3rd rapid skip
    expect(updated.rapidSkipStreak).toBe(0); // Reset after penalty
    expect(updated.pool).toBe("probation");
    expect(updated.penaltyUntil).not.toBeNull();
    expect(updated.penaltyUntil!).toBeGreaterThan(Date.now());
  });

  it("does not modify original TrustScore (immutability)", () => {
    const ts = createDefaultTrustScore("user-1");
    const original = { ...ts };
    handleRapidSkip(ts, 2);
    expect(ts.rapidSkipStreak).toBe(original.rapidSkipStreak);
  });
});

// ==================== isUnderPenalty ====================

describe("isUnderPenalty", () => {
  it("returns false when no penalty", () => {
    const ts = createDefaultTrustScore("user-1");
    expect(isUnderPenalty(ts)).toBe(false);
  });

  it("returns true during active penalty", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.penaltyUntil = Date.now() + 60000;
    expect(isUnderPenalty(ts)).toBe(true);
  });

  it("returns false after penalty expired", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.penaltyUntil = Date.now() - 1000; // Expired
    expect(isUnderPenalty(ts)).toBe(false);
  });
});

// ==================== getEffectivePool ====================

describe("getEffectivePool", () => {
  it("returns actual pool when no penalty", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.pool = "trusted";
    expect(getEffectivePool(ts)).toBe("trusted");
  });

  it("returns 'probation' during Ghost Skip penalty", () => {
    const ts = createDefaultTrustScore("user-1");
    ts.pool = "trusted";
    ts.penaltyUntil = Date.now() + 60000;
    expect(getEffectivePool(ts)).toBe("probation");
  });
});

// ==================== getMatchingBonus ====================

describe("getMatchingBonus", () => {
  it("returns +5 for trusted", () => {
    expect(getMatchingBonus("trusted")).toBe(5);
  });

  it("returns 0 for regular", () => {
    expect(getMatchingBonus("regular")).toBe(0);
  });

  it("returns -3 for probation", () => {
    expect(getMatchingBonus("probation")).toBe(-3);
  });
});

// ==================== Edge Cases ====================

describe("Edge Cases", () => {
  it("handles duration capped at maxDuration (1800s)", () => {
    const behaviors = [makeBehavior({ duration: 10000 })]; // 10000 сек
    const factors = calculateFactors(behaviors, 0);
    // Should cap at maxDuration, so ratio = min(1800/180, 1) = 1 → max score
    expect(factors.sessionDuration).toBe(TRUST_CONFIG.weights.sessionDuration);
  });

  it("handles single behavior correctly", () => {
    const behaviors = [makeBehavior()];
    const factors = calculateFactors(behaviors, 0);
    const score = calculateScore(factors);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("consistent pool/badge mapping", () => {
    for (let score = 0; score <= 100; score++) {
      const pool = scoreToPool(score);
      const badge = scoreToBadge(score);
      // Pool and badge should be consistent
      if (pool === "trusted") expect(badge).toBe("trusted");
      if (pool === "regular") expect(badge).toBe("regular");
      if (pool === "probation") expect(badge).toBe("low");
    }
  });
});
