import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== Тестируем rate limit логику (без Redis) ====================

// Мокаем Redis — код использует redis.multi().incr().expire().ttl().exec()
const mockExec = vi.fn();

const mockMultiChain = {
  incr: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  ttl: vi.fn().mockReturnThis(),
  exec: mockExec,
};

vi.mock("@/lib/redis", () => ({
  redis: {
    multi: vi.fn(() => mockMultiChain),
  },
}));

import { checkRateLimit, checkRateLimitStrict } from "@/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
  mockMultiChain.incr.mockReturnThis();
  mockMultiChain.expire.mockReturnThis();
  mockMultiChain.ttl.mockReturnThis();
});

describe("checkRateLimit (fail-open)", () => {
  it("allows first request", async () => {
    // exec returns [[err, result], ...] for each command in the pipeline
    mockExec.mockResolvedValue([
      [null, 1],   // incr → 1
      [null, 1],   // expire → ok
      [null, 60],  // ttl → 60
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetIn).toBe(60);
  });

  it("allows request within limit", async () => {
    mockExec.mockResolvedValue([
      [null, 5],   // incr → 5
      [null, 0],   // expire
      [null, 45],  // ttl → 45
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("blocks request over limit", async () => {
    mockExec.mockResolvedValue([
      [null, 11],  // incr → 11
      [null, 0],   // expire
      [null, 30],  // ttl → 30
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows request when Redis is down (fail-open)", async () => {
    mockExec.mockRejectedValue(new Error("Connection refused"));

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true); // fail-open
    expect(result.remaining).toBe(10);
  });

  it("sets expire via multi pipeline", async () => {
    mockExec.mockResolvedValue([
      [null, 1],   // incr → 1
      [null, 1],   // expire → ok
      [null, 60],  // ttl → 60
    ]);

    await checkRateLimit("test:key", 10, 60);
    // expire is always called in the multi pipeline
    expect(mockMultiChain.expire).toHaveBeenCalled();
  });

  it("does not fail on subsequent requests", async () => {
    mockExec.mockResolvedValue([
      [null, 3],   // incr → 3
      [null, 0],   // expire
      [null, 45],  // ttl → 45
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(7);
  });
});

describe("checkRateLimitStrict (fail-closed)", () => {
  it("allows request within limit", async () => {
    mockExec.mockResolvedValue([
      [null, 3],    // incr → 3
      [null, 0],    // expire
      [null, 200],  // ttl → 200
    ]);

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks request over limit", async () => {
    mockExec.mockResolvedValue([
      [null, 6],    // incr → 6
      [null, 0],    // expire
      [null, 100],  // ttl → 100
    ]);

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows request when Redis is down in dev (fail-open in dev)", async () => {
    mockExec.mockRejectedValue(new Error("Connection refused"));

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    // In dev mode (NODE_ENV=test), it falls through to allow
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });
});

describe("Rate Limit — edge cases", () => {
  it("handles TTL returning -1 (key has no expiry)", async () => {
    mockExec.mockResolvedValue([
      [null, 2],   // incr → 2
      [null, 0],   // expire
      [null, -1],  // ttl → -1
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.resetIn).toBe(60); // defaults to window
  });

  it("handles boundary — exactly at limit", async () => {
    mockExec.mockResolvedValue([
      [null, 10],  // incr → 10
      [null, 0],   // expire
      [null, 30],  // ttl → 30
    ]);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true); // exactly at limit = allowed
    expect(result.remaining).toBe(0);
  });
});
