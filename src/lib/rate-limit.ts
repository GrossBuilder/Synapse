/**
 * Rate Limiter — ограничение частоты запросов через Redis.
 * Использует sliding window с Redis INCR + EXPIRE.
 */

import { redis } from "./redis";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // секунд до сброса
}

/**
 * Проверяет rate limit для ключа (IP, userId, endpoint).
 * @param key — уникальный идентификатор (например `ratelimit:login:192.168.1.1`)
 * @param maxRequests — максимум запросов за окно
 * @param windowSeconds — размер окна в секундах
 */
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;

  try {
    const results = await redis.multi()
      .incr(redisKey)
      .expire(redisKey, windowSeconds)
      .ttl(redisKey)
      .exec();

    const current = (results?.[0]?.[1] as number) || 1;
    const ttl = (results?.[2]?.[1] as number) || windowSeconds;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // Redis down — пропускаем (fail-open для доступности)
    console.warn("[RateLimit] Redis unavailable, allowing request");
    return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
  }
}

/**
 * Strict rate limit — fail-CLOSED (блокирует при падении Redis).
 * Для чувствительных эндпоинтов: login, payments.
 */
export async function checkRateLimitStrict(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;

  try {
    const results = await redis.multi()
      .incr(redisKey)
      .expire(redisKey, windowSeconds)
      .ttl(redisKey)
      .exec();

    const current = (results?.[0]?.[1] as number) || 1;
    const ttl = (results?.[2]?.[1] as number) || windowSeconds;

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
      resetIn: ttl > 0 ? ttl : windowSeconds,
    };
  } catch {
    // Redis down — в dev-режиме пропускаем, в prod блокируем (fail-closed)
    if (process.env.NODE_ENV !== "production") {
      console.warn("[RateLimit] Redis unavailable in dev, allowing request");
      return { allowed: true, remaining: maxRequests, resetIn: windowSeconds };
    }
    console.error("[RateLimit] Redis unavailable, BLOCKING sensitive request (fail-closed)");
    return { allowed: false, remaining: 0, resetIn: windowSeconds };
  }
}

/**
 * Rate limit для API endpoint по IP.
 */
export async function rateLimitByIP(
  ip: string,
  endpoint: string,
  maxRequests: number = 30,
  windowSeconds: number = 60,
): Promise<RateLimitResult> {
  return checkRateLimit(`${endpoint}:${ip}`, maxRequests, windowSeconds);
}

/**
 * Строгий rate limit для чувствительных эндпоинтов (логин, платежи).
 * Использует fail-closed — при недоступности Redis запросы блокируются.
 */
export async function strictRateLimit(
  ip: string,
  endpoint: string,
): Promise<RateLimitResult> {
  return checkRateLimitStrict(`${endpoint}:${ip}`, 5, 300); // 5 попыток за 5 минут
}
