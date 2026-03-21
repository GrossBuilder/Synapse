import { describe, it, expect, vi, beforeEach } from "vitest";

// ==================== Тестируем rate limit логику (без Redis) ====================

// Мокаем Redis
vi.mock("@/lib/redis", () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn(),
  },
}));

import { checkRateLimit, checkRateLimitStrict } from "@/lib/rate-limit";
import { redis } from "@/lib/redis";

const mockedRedis = vi.mocked(redis);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkRateLimit (fail-open)", () => {
  it("allows first request", async () => {
    mockedRedis.incr.mockResolvedValue(1);
    mockedRedis.expire.mockResolvedValue(1);
    mockedRedis.ttl.mockResolvedValue(60);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    expect(result.resetIn).toBe(60);
  });

  it("allows request within limit", async () => {
    mockedRedis.incr.mockResolvedValue(5);
    mockedRedis.ttl.mockResolvedValue(45);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(5);
  });

  it("blocks request over limit", async () => {
    mockedRedis.incr.mockResolvedValue(11);
    mockedRedis.ttl.mockResolvedValue(30);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("allows request when Redis is down (fail-open)", async () => {
    mockedRedis.incr.mockRejectedValue(new Error("Connection refused"));

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true); // fail-open
    expect(result.remaining).toBe(10);
  });

  it("sets expire on first request only", async () => {
    mockedRedis.incr.mockResolvedValue(1);
    mockedRedis.expire.mockResolvedValue(1);
    mockedRedis.ttl.mockResolvedValue(60);

    await checkRateLimit("test:key", 10, 60);
    expect(mockedRedis.expire).toHaveBeenCalledWith("ratelimit:test:key", 60);
  });

  it("does not set expire on subsequent requests", async () => {
    mockedRedis.incr.mockResolvedValue(3);
    mockedRedis.ttl.mockResolvedValue(45);

    await checkRateLimit("test:key", 10, 60);
    expect(mockedRedis.expire).not.toHaveBeenCalled();
  });
});

describe("checkRateLimitStrict (fail-closed)", () => {
  it("allows request within limit", async () => {
    mockedRedis.incr.mockResolvedValue(3);
    mockedRedis.ttl.mockResolvedValue(200);

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks request over limit", async () => {
    mockedRedis.incr.mockResolvedValue(6);
    mockedRedis.ttl.mockResolvedValue(100);

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("BLOCKS request when Redis is down (fail-closed)", async () => {
    mockedRedis.incr.mockRejectedValue(new Error("Connection refused"));

    const result = await checkRateLimitStrict("login:1.2.3.4", 5, 300);
    expect(result.allowed).toBe(false); // fail-closed!
    expect(result.remaining).toBe(0);
  });
});

describe("Rate Limit — edge cases", () => {
  it("handles TTL returning -1 (key has no expiry)", async () => {
    mockedRedis.incr.mockResolvedValue(2);
    mockedRedis.ttl.mockResolvedValue(-1);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true);
    expect(result.resetIn).toBe(60); // defaults to window
  });

  it("handles boundary — exactly at limit", async () => {
    mockedRedis.incr.mockResolvedValue(10);
    mockedRedis.ttl.mockResolvedValue(30);

    const result = await checkRateLimit("test:key", 10, 60);
    expect(result.allowed).toBe(true); // exactly at limit = allowed
    expect(result.remaining).toBe(0);
  });
});
