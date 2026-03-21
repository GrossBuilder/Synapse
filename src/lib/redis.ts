import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

// Ключи Redis для очередей матчинга
export const REDIS_KEYS = {
  QUEUE: (categorySlug: string) => `queue:${categorySlug}`,
  USER_QUEUE: (userId: string) => `user:queue:${userId}`,
  SESSION: (sessionId: string) => `session:${sessionId}`,
  ONLINE_COUNT: "online:count",
  CATEGORY_COUNT: (slug: string) => `online:category:${slug}`,

  // Trust Score
  TRUST_SCORE: (userId: string) => `trust:score:${userId}`,
  TRUST_BEHAVIOR: (userId: string) => `trust:behavior:${userId}`,
  TRUST_PENALTY: (userId: string) => `trust:penalty:${userId}`,
  TRUST_RAPID_SKIP: (userId: string) => `trust:rapid-skip:${userId}`,

  // Payments
  PAYMENT: (paymentId: string) => `payment:${paymentId}`,
  USER_PAYMENTS: (userId: string) => `payment:user:${userId}`,
  COMPLETED_TX: (txId: string) => `payment:tx:${txId}`,
  PAYMENT_MICRO_COUNTER: "payment:micro-counter",
} as const;
