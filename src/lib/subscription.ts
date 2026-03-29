/**
 * Subscription Engine — система подписок и монетизации Synapse.
 *
 * Тарифы:
 *   Free  — 15 чатов/день, 1 ремatch, только свой регион
 *   Plus  ($4.99/мес) — безлимит чатов, 5 ремatch, все регионы, x2 приоритет
 *   Pro   ($9.99/мес) — всё из Plus + x3 приоритет, групповые комнаты, аналитика
 *
 * Бусты (разовые покупки):
 *   Queue Boost    ($0.99) — 30 мин в начале очереди
 *   Region Unlock  ($1.49) — 24 часа все регионы
 *   Spotlight      ($1.99) — 24 часа подсветка профиля
 */

import type {
  SubscriptionPlan,
  PlanLimits,
  BoostType,
  ActiveBoost,
  PricingInfo,
} from "@/types";

// ==================== КОНФИГУРАЦИЯ ТАРИФОВ ====================

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    chatsPerDay: 15,
    queuePriority: 1,
    rematchPerDay: 1,
    allRegions: false,
    invisibleSkip: false,
    verifiedBadgeFree: false,
    createGroupRooms: false,
    chatAnalytics: false,
    noAds: false,
  },
  plus: {
    chatsPerDay: Infinity,
    queuePriority: 2,
    rematchPerDay: 5,
    allRegions: true,
    invisibleSkip: true,
    verifiedBadgeFree: true,
    createGroupRooms: false,
    chatAnalytics: false,
    noAds: true,
  },
  pro: {
    chatsPerDay: Infinity,
    queuePriority: 3,
    rematchPerDay: Infinity,
    allRegions: true,
    invisibleSkip: true,
    verifiedBadgeFree: true,
    createGroupRooms: true,
    chatAnalytics: true,
    noAds: true,
  },
};

// ==================== ЦЕНЫ ====================

export type BillingPeriod = "monthly" | "yearly";

export const PRICING: Record<SubscriptionPlan, number> = {
  free: 0,
  plus: 4.99,
  pro: 9.99,
};

export const YEARLY_PRICING: Record<SubscriptionPlan, number> = {
  free: 0,
  plus: 49.99,   // ~$4.17/мес, скидка ~16%
  pro: 99.99,    // ~$8.33/мес, скидка ~17%
};

export function getPlanPrice(plan: SubscriptionPlan, period: BillingPeriod): number {
  return period === "yearly" ? YEARLY_PRICING[plan] : PRICING[plan];
}

export function getPlanDurationMs(period: BillingPeriod): number {
  return period === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
}

export const BOOST_PRICING: Record<BoostType, { price: number; durationMs: number; label: string }> = {
  queue: {
    price: 0.99,
    durationMs: 30 * 60 * 1000,     // 30 мин
    label: "Queue Boost",
  },
  region: {
    price: 1.49,
    durationMs: 24 * 60 * 60 * 1000, // 24 часа
    label: "Region Unlock",
  },
  spotlight: {
    price: 1.99,
    durationMs: 24 * 60 * 60 * 1000, // 24 часа
    label: "Category Spotlight",
  },
};

export const VERIFIED_BADGE_PRICE = 2.99;

// ==================== ИНФОРМАЦИЯ О ТАРИФАХ (для UI) ====================

export const PRICING_INFO: PricingInfo[] = [
  {
    plan: "free",
    name: "Free",
    price: 0,
    features: [
      "15 chats per day",
      "1 rematch per day",
      "Your region only",
      "Standard queue",
    ],
  },
  {
    plan: "plus",
    name: "Synapse+",
    price: 4.99,
    features: [
      "Unlimited chats",
      "5 rematches per day",
      "All regions",
      "x2 queue priority",
      "Invisible skip",
      "Free Verified Badge",
      "No ads",
    ],
  },
  {
    plan: "pro",
    name: "Synapse Pro",
    price: 9.99,
    features: [
      "Everything in Plus",
      "x3 queue priority",
      "Unlimited rematches",
      "Create group rooms",
      "Chat analytics",
    ],
  },
];

// ==================== УТИЛИТЫ ====================

/**
 * Получить лимиты для тарифа.
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Проверить, может ли пользователь начать ещё один чат.
 * Возвращает { allowed, used, limit }.
 */
export function canStartChat(
  plan: SubscriptionPlan,
  chatsToday: number,
): { allowed: boolean; used: number; limit: number } {
  const limits = PLAN_LIMITS[plan];
  return {
    allowed: chatsToday < limits.chatsPerDay,
    used: chatsToday,
    limit: limits.chatsPerDay,
  };
}

/**
 * Проверить, может ли пользователь сделать ремatch.
 */
export function canRematch(
  plan: SubscriptionPlan,
  rematchesToday: number,
): { allowed: boolean; used: number; limit: number } {
  const limits = PLAN_LIMITS[plan];
  return {
    allowed: rematchesToday < limits.rematchPerDay,
    used: rematchesToday,
    limit: limits.rematchPerDay,
  };
}

/**
 * Получить бонус к приоритету очереди (для матчинга).
 * Учитывает тарифный план + активные бусты.
 */
export function getQueuePriorityBonus(
  plan: SubscriptionPlan,
  activeBoosts: ActiveBoost[],
): number {
  let priority = PLAN_LIMITS[plan].queuePriority;

  // Queue Boost: +5 к приоритету
  const hasQueueBoost = activeBoosts.some(
    (b) => b.type === "queue" && Date.now() < b.expiresAt,
  );
  if (hasQueueBoost) priority += 5;

  return priority;
}

/**
 * Проверить, доступны ли все регионы (подписка или буст).
 */
export function hasAllRegions(
  plan: SubscriptionPlan,
  activeBoosts: ActiveBoost[],
): boolean {
  if (PLAN_LIMITS[plan].allRegions) return true;

  // Region Unlock Boost
  return activeBoosts.some(
    (b) => b.type === "region" && Date.now() < b.expiresAt,
  );
}

/**
 * Проверить, есть ли активный буст определённого типа.
 */
export function hasActiveBoost(
  boosts: ActiveBoost[],
  type: BoostType,
): boolean {
  return boosts.some((b) => b.type === type && Date.now() < b.expiresAt);
}

/**
 * Очистить истёкшие бусты из списка.
 */
export function cleanExpiredBoosts(boosts: ActiveBoost[]): ActiveBoost[] {
  return boosts.filter((b) => Date.now() < b.expiresAt);
}

/**
 * Получить сегодняшнюю дату в формате YYYY-MM-DD.
 */
export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}
