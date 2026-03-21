/**
 * Trust Score Engine — поведенческая система репутации Synapse.
 *
 * Формула: score = sessionDuration(30) + skipRate(25) + reportCleanness(20) + cameraUsage(15) + chatActivity(10)
 *
 * Пулы (скрытые):
 *   - TRUSTED  (score > 70) — быстрый матч, приоритет в очереди
 *   - REGULAR  (30–70)     — стандартная очередь
 *   - PROBATION (< 30)     — матчатся только между собой / долгое ожидание
 *
 * Ghost Skip: 3 быстрых скипа (< 5 сек) подряд → PROBATION на 10 мин
 */

import type {
  TrustScore,
  TrustFactors,
  TrustPool,
  TrustBadge,
  SessionBehavior,
} from "@/types";

// ==================== КОНФИГУРАЦИЯ ====================

export const TRUST_CONFIG = {
  /** Веса факторов (сумма = 100) */
  weights: {
    sessionDuration: 30,
    skipRate: 25,
    reportCleanness: 20,
    cameraUsage: 15,
    chatActivity: 10,
  },

  /** Пороги пулов */
  pools: {
    trustedThreshold: 70,
    probationThreshold: 30,
  },

  /** Параметры сессий */
  session: {
    /** Минимум секунд для «хорошей» сессии */
    goodDuration: 180,
    /** Максимум секунд для расчёта (ограничиваем влияние сверхдолгих) */
    maxDuration: 1800,
    /** Секунд скипа, считающихся «быстрым» */
    rapidSkipThreshold: 5,
    /** Быстрых скипов подряд до Ghost Skip */
    rapidSkipLimit: 3,
    /** Штраф Ghost Skip, минуты */
    ghostPenaltyMinutes: 10,
  },

  /** Сколько последних сессий учитывать */
  historyWindow: 50,

  /** Дней для расчёта чистоты от жалоб */
  reportCleannessDays: 30,

  /** Начальный скор для нового пользователя */
  defaultScore: 50,
} as const;

// ==================== РАСЧЁТ ФАКТОРОВ ====================

/**
 * Рассчитывает фактор «Средняя длительность сессий» (0–30)
 * > 3 мин средняя → 30, < 30 сек → 0
 */
function calcSessionDuration(behaviors: SessionBehavior[]): number {
  if (behaviors.length === 0) return TRUST_CONFIG.weights.sessionDuration * 0.5;

  const durations = behaviors.map((b) =>
    Math.min(b.duration, TRUST_CONFIG.session.maxDuration)
  );
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;

  // Нормализуем: 0 сек → 0, ≥ 180 сек → 1
  const ratio = Math.min(avg / TRUST_CONFIG.session.goodDuration, 1);
  return Math.round(ratio * TRUST_CONFIG.weights.sessionDuration * 10) / 10;
}

/**
 * Рассчитывает фактор «Skip Rate» (0–25)
 * Если тебя часто скипают → низкий балл
 */
function calcSkipRate(behaviors: SessionBehavior[]): number {
  if (behaviors.length === 0) return TRUST_CONFIG.weights.skipRate * 0.5;

  const skippedCount = behaviors.filter((b) => b.wasSkippedByPartner).length;
  const skipRatio = skippedCount / behaviors.length;

  // Инвертируем: 0% скипов → макс балл, 100% скипов → 0
  const score = (1 - skipRatio) * TRUST_CONFIG.weights.skipRate;
  return Math.round(score * 10) / 10;
}

/**
 * Рассчитывает фактор «Чистота от жалоб за 30 дней» (0–20)
 */
function calcReportCleanness(
  recentReportCount: number,
): number {
  // 0 жалоб → 20, 1 → 15, 2 → 10, 3 → 5, 4+ → 0
  const penalty = Math.min(recentReportCount, 4) * 5;
  return TRUST_CONFIG.weights.reportCleanness - penalty;
}

/**
 * Рассчитывает фактор «Camera Usage» (0–15)
 */
function calcCameraUsage(behaviors: SessionBehavior[]): number {
  if (behaviors.length === 0) return TRUST_CONFIG.weights.cameraUsage * 0.5;

  const avgCamera =
    behaviors.reduce((sum, b) => sum + b.cameraOnPercent, 0) / behaviors.length;

  // ≥ 80% камера вкл → макс, < 20% → 0
  const ratio = Math.min(avgCamera / 80, 1);
  return Math.round(ratio * TRUST_CONFIG.weights.cameraUsage * 10) / 10;
}

/**
 * Рассчитывает фактор «Текстовая активность» (0–10)
 */
function calcChatActivity(behaviors: SessionBehavior[]): number {
  if (behaviors.length === 0) return TRUST_CONFIG.weights.chatActivity * 0.5;

  const avgMessages =
    behaviors.reduce((sum, b) => sum + b.messagesSent, 0) / behaviors.length;

  // ≥ 5 сообщений за сессию → макс
  const ratio = Math.min(avgMessages / 5, 1);
  return Math.round(ratio * TRUST_CONFIG.weights.chatActivity * 10) / 10;
}

// ==================== ОСНОВНЫЕ ФУНКЦИИ ====================

/**
 * Рассчитывает все факторы Trust Score на основе истории поведения.
 */
export function calculateFactors(
  behaviors: SessionBehavior[],
  recentReportCount: number,
): TrustFactors {
  const recent = behaviors
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, TRUST_CONFIG.historyWindow);

  return {
    sessionDuration: calcSessionDuration(recent),
    skipRate: calcSkipRate(recent),
    reportCleanness: calcReportCleanness(recentReportCount),
    cameraUsage: calcCameraUsage(recent),
    chatActivity: calcChatActivity(recent),
  };
}

/**
 * Суммарный скор из факторов (0–100).
 */
export function calculateScore(factors: TrustFactors): number {
  const raw =
    factors.sessionDuration +
    factors.skipRate +
    factors.reportCleanness +
    factors.cameraUsage +
    factors.chatActivity;

  return Math.round(Math.max(0, Math.min(100, raw)));
}

/**
 * Определяет пул пользователя по скору.
 */
export function scoreToPool(score: number): TrustPool {
  if (score >= TRUST_CONFIG.pools.trustedThreshold) return "trusted";
  if (score >= TRUST_CONFIG.pools.probationThreshold) return "regular";
  return "probation";
}

/**
 * Определяет бейдж пользователя (видимый).
 */
export function scoreToBadge(score: number): TrustBadge {
  if (score >= TRUST_CONFIG.pools.trustedThreshold) return "trusted";
  if (score >= TRUST_CONFIG.pools.probationThreshold) return "regular";
  return "low";
}

/**
 * Полный пересчёт Trust Score пользователя.
 */
export function recalculateTrustScore(
  userId: string,
  behaviors: SessionBehavior[],
  recentReportCount: number,
  existing?: Partial<TrustScore>,
): TrustScore {
  const factors = calculateFactors(behaviors, recentReportCount);
  const score = calculateScore(factors);
  const pool = scoreToPool(score);
  const badge = scoreToBadge(score);

  return {
    userId,
    score,
    pool,
    badge,
    factors,
    rapidSkipStreak: existing?.rapidSkipStreak ?? 0,
    penaltyUntil: existing?.penaltyUntil ?? null,
    updatedAt: Date.now(),
  };
}

/**
 * Создаёт начальный Trust Score для нового пользователя.
 */
export function createDefaultTrustScore(userId: string): TrustScore {
  return {
    userId,
    score: TRUST_CONFIG.defaultScore,
    pool: "regular",
    badge: "regular",
    factors: {
      sessionDuration: TRUST_CONFIG.weights.sessionDuration * 0.5,
      skipRate: TRUST_CONFIG.weights.skipRate * 0.5,
      reportCleanness: TRUST_CONFIG.weights.reportCleanness,
      cameraUsage: TRUST_CONFIG.weights.cameraUsage * 0.5,
      chatActivity: TRUST_CONFIG.weights.chatActivity * 0.5,
    },
    rapidSkipStreak: 0,
    penaltyUntil: null,
    updatedAt: Date.now(),
  };
}

// ==================== GHOST SKIP ====================

/**
 * Обрабатывает быстрый скип. Возвращает обновлённый Trust Score.
 * Если достигнут лимит → назначает штраф (PROBATION на N мин).
 */
export function handleRapidSkip(ts: TrustScore, skipDuration: number): TrustScore {
  if (skipDuration >= TRUST_CONFIG.session.rapidSkipThreshold) {
    // Нормальный скип — сбрасываем стрик
    return { ...ts, rapidSkipStreak: 0 };
  }

  const newStreak = ts.rapidSkipStreak + 1;

  if (newStreak >= TRUST_CONFIG.session.rapidSkipLimit) {
    // Ghost Skip! Штраф: принудительный PROBATION
    return {
      ...ts,
      rapidSkipStreak: 0,
      pool: "probation",
      penaltyUntil:
        Date.now() + TRUST_CONFIG.session.ghostPenaltyMinutes * 60 * 1000,
      updatedAt: Date.now(),
    };
  }

  return { ...ts, rapidSkipStreak: newStreak, updatedAt: Date.now() };
}

/**
 * Проверяет, активен ли штраф Ghost Skip.
 */
export function isUnderPenalty(ts: TrustScore): boolean {
  return ts.penaltyUntil !== null && Date.now() < ts.penaltyUntil;
}

/**
 * Определяет эффективный пул с учётом штрафа.
 */
export function getEffectivePool(ts: TrustScore): TrustPool {
  if (isUnderPenalty(ts)) return "probation";
  return ts.pool;
}

// ==================== МАТЧИНГ-БОНУС ====================

/**
 * Возвращает бонус к скору матчинга на основе Trust Score.
 * Trusted: +5, Regular: +0, Probation: -3
 */
export function getMatchingBonus(pool: TrustPool): number {
  switch (pool) {
    case "trusted":
      return 5;
    case "regular":
      return 0;
    case "probation":
      return -3;
  }
}
