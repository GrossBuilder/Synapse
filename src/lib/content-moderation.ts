/**
 * Content Moderation Service — AI pre-screen для видеочата Synapse.
 *
 * Архитектура:
 *   1. Пользователь отправляет кадр камеры перед матчингом (pre-screen)
 *   2. Кадр анализируется провайдером (Sightengine / Google Vision / TF.js)
 *   3. При обнаружении нарушения — блокировка матчинга + авто-репорт
 *
 * Провайдеры (подключаются через env-переменные):
 *   - MODERATION_PROVIDER=sightengine (по умолчанию)
 *   - MODERATION_PROVIDER=google-vision
 *   - MODERATION_PROVIDER=mock (для разработки)
 */

import { prisma } from "./prisma";

// ==================== ТИПЫ ====================

export type ViolationType = "nudity" | "violence" | "drugs" | "weapons" | "hate_symbols";

export interface ModerationResult {
  safe: boolean;
  violations: Array<{
    type: ViolationType;
    confidence: number; // 0.0–1.0
  }>;
  /** Время анализа в мс */
  processingMs: number;
}

export interface ModerationAction {
  allowed: boolean;
  reason?: string;
  violations: ViolationType[];
  /** Какое действие было применено */
  action: "none" | "blocked" | "warned" | "reported";
}

// ==================== КОНФИГУРАЦИЯ ====================

export const MODERATION_CONFIG = {
  /** Порог уверенности для блокировки (0.0–1.0) */
  blockThreshold: 0.75,
  /** Порог уверенности для предупреждения */
  warnThreshold: 0.50,
  /** Таймаут анализа кадра (мс) */
  analysisTimeoutMs: 5000,
  /** Максимальный размер кадра (bytes) — 500KB */
  maxFrameSize: 512_000,
  /** Включена ли модерация */
  enabled: !!process.env.MODERATION_PROVIDER,
  /** Провайдер */
  provider: (process.env.MODERATION_PROVIDER || "mock") as "sightengine" | "google-vision" | "mock" | "test",
} as const;

// ==================== ПРОВАЙДЕРЫ ====================

/**
 * Mock-провайдер для разработки — всегда возвращает safe.
 */
async function analyzeMock(): Promise<ModerationResult> {
  return { safe: true, violations: [], processingMs: 1 };
}

/**
 * Test-провайдер — всегда находит нарушение (nudity 0.9).
 * Используется для локального тестирования блокировки.
 * Активация: MODERATION_PROVIDER=test в .env
 */
async function analyzeTest(): Promise<ModerationResult> {
  return {
    safe: false,
    violations: [{ type: "nudity", confidence: 0.92 }],
    processingMs: 50,
  };
}

/**
 * Sightengine API — анализ изображения.
 * Требует SIGHTENGINE_API_USER и SIGHTENGINE_API_SECRET.
 * https://sightengine.com/docs/
 */
async function analyzeSightengine(frameBase64: string): Promise<ModerationResult> {
  const apiUser = process.env.SIGHTENGINE_API_USER;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!apiUser || !apiSecret) {
    console.warn("[Moderation] Sightengine API keys not configured, falling back to mock");
    return analyzeMock();
  }

  const start = Date.now();

  const formData = new FormData();
  // Конвертируем base64 в blob
  const binaryStr = atob(frameBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  formData.append("media", new Blob([bytes], { type: "image/jpeg" }), "frame.jpg");
  formData.append("models", "nudity-2.1,weapon,recreational_drug,gore-2.0");
  formData.append("api_user", apiUser);
  formData.append("api_secret", apiSecret);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_CONFIG.analysisTimeoutMs);

  try {
    const response = await fetch("https://api.sightengine.com/1.0/check.json", {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[Moderation] Sightengine API error:", response.status);
      return { safe: true, violations: [], processingMs: Date.now() - start };
    }

    const data = await response.json();
    const violations: ModerationResult["violations"] = [];

    // Nudity check
    if (data.nudity) {
      const nudityScore = Math.max(
        data.nudity.sexual_activity || 0,
        data.nudity.sexual_display || 0,
        data.nudity.erotica || 0,
      );
      if (nudityScore >= MODERATION_CONFIG.warnThreshold) {
        violations.push({ type: "nudity", confidence: nudityScore });
      }
    }

    // Weapon check
    if (data.weapon) {
      const weaponScore = Math.max(...Object.values(data.weapon).filter((v): v is number => typeof v === "number"));
      if (weaponScore >= MODERATION_CONFIG.warnThreshold) {
        violations.push({ type: "weapons", confidence: weaponScore });
      }
    }

    // Drugs check
    if (data.recreational_drug) {
      const drugScore = Math.max(...Object.values(data.recreational_drug).filter((v): v is number => typeof v === "number"));
      if (drugScore >= MODERATION_CONFIG.warnThreshold) {
        violations.push({ type: "drugs", confidence: drugScore });
      }
    }

    // Gore/Violence check
    if (data.gore) {
      const goreScore = data.gore.prob || 0;
      if (goreScore >= MODERATION_CONFIG.warnThreshold) {
        violations.push({ type: "violence", confidence: goreScore });
      }
    }

    return {
      safe: violations.filter(v => v.confidence >= MODERATION_CONFIG.blockThreshold).length === 0,
      violations,
      processingMs: Date.now() - start,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("[Moderation] Sightengine analysis failed:", err);
    // Fail open — разрешаем если API недоступен
    return { safe: true, violations: [], processingMs: Date.now() - start };
  }
}

/**
 * Google Cloud Vision API.
 * Требует GOOGLE_VISION_API_KEY.
 */
async function analyzeGoogleVision(frameBase64: string): Promise<ModerationResult> {
  const apiKey = process.env.GOOGLE_VISION_API_KEY;
  if (!apiKey) {
    console.warn("[Moderation] Google Vision API key not configured, falling back to mock");
    return analyzeMock();
  }

  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODERATION_CONFIG.analysisTimeoutMs);

  try {
    const response = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [{
            image: { content: frameBase64 },
            features: [{ type: "SAFE_SEARCH_DETECTION" }],
          }],
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      console.error("[Moderation] Google Vision API error:", response.status);
      return { safe: true, violations: [], processingMs: Date.now() - start };
    }

    const data = await response.json();
    const annotations = data.responses?.[0]?.safeSearchAnnotation;
    if (!annotations) {
      return { safe: true, violations: [], processingMs: Date.now() - start };
    }

    const likelihoodToScore: Record<string, number> = {
      UNKNOWN: 0, VERY_UNLIKELY: 0.1, UNLIKELY: 0.25, POSSIBLE: 0.5, LIKELY: 0.75, VERY_LIKELY: 0.95,
    };

    const violations: ModerationResult["violations"] = [];

    const adultScore = likelihoodToScore[annotations.adult] || 0;
    if (adultScore >= MODERATION_CONFIG.warnThreshold) {
      violations.push({ type: "nudity", confidence: adultScore });
    }

    const violenceScore = likelihoodToScore[annotations.violence] || 0;
    if (violenceScore >= MODERATION_CONFIG.warnThreshold) {
      violations.push({ type: "violence", confidence: violenceScore });
    }

    return {
      safe: violations.filter(v => v.confidence >= MODERATION_CONFIG.blockThreshold).length === 0,
      violations,
      processingMs: Date.now() - start,
    };
  } catch (err) {
    clearTimeout(timeout);
    console.error("[Moderation] Google Vision analysis failed:", err);
    return { safe: true, violations: [], processingMs: Date.now() - start };
  }
}

// ==================== ОСНОВНОЙ СЕРВИС ====================

/**
 * Анализирует кадр камеры на запрещённый контент.
 * @param frameBase64 — кадр в формате base64 (JPEG)
 * @returns ModerationResult
 */
export async function analyzeFrame(frameBase64: string): Promise<ModerationResult> {
  // Проверка размера
  const sizeBytes = Math.ceil(frameBase64.length * 3 / 4);
  if (sizeBytes > MODERATION_CONFIG.maxFrameSize) {
    return { safe: true, violations: [], processingMs: 0 };
  }

  switch (MODERATION_CONFIG.provider) {
    case "sightengine":
      return analyzeSightengine(frameBase64);
    case "google-vision":
      return analyzeGoogleVision(frameBase64);
    case "test":
      return analyzeTest();
    case "mock":
    default:
      return analyzeMock();
  }
}

/**
 * Проверяет кадр и применяет действие:
 * - safe → разрешить
 * - warn threshold → предупреждение, но разрешить
 * - block threshold → заблокировать + авто-репорт
 */
export async function moderateFrame(
  userId: string,
  frameBase64: string,
  sessionId?: string,
  source: "pre-screen" | "in-session" = "pre-screen",
): Promise<ModerationAction> {
  if (!MODERATION_CONFIG.enabled) {
    return { allowed: true, violations: [], action: "none" };
  }

  const result = await analyzeFrame(frameBase64);
  const blockViolations = result.violations.filter(v => v.confidence >= MODERATION_CONFIG.blockThreshold);
  const warnViolations = result.violations.filter(v => v.confidence >= MODERATION_CONFIG.warnThreshold && v.confidence < MODERATION_CONFIG.blockThreshold);

  if (blockViolations.length > 0) {
    // Логируем в БД
    for (const v of blockViolations) {
      await prisma.contentModerationLog.create({
        data: {
          userId,
          type: v.type,
          confidence: v.confidence,
          action: "blocked",
          source,
          sessionId,
        },
      });
    }

    // Авто-репорт
    const violationNames = blockViolations.map(v => v.type).join(", ");
    await createAutoReport(userId, violationNames);

    return {
      allowed: false,
      reason: `Content violation detected: ${violationNames}`,
      violations: blockViolations.map(v => v.type),
      action: "blocked",
    };
  }

  if (warnViolations.length > 0) {
    // Логируем предупреждения
    for (const v of warnViolations) {
      await prisma.contentModerationLog.create({
        data: {
          userId,
          type: v.type,
          confidence: v.confidence,
          action: "warned",
          source,
          sessionId,
        },
      });
    }

    return {
      allowed: true, // Пропускаем, но предупреждаем
      reason: `Suspicious content: ${warnViolations.map(v => v.type).join(", ")}`,
      violations: warnViolations.map(v => v.type),
      action: "warned",
    };
  }

  return { allowed: true, violations: [], action: "none" };
}

/**
 * Создаёт авто-репорт от системы при обнаружении нарушения.
 */
async function createAutoReport(userId: string, violationTypes: string) {
  // Используем системного юзера "SYSTEM" как репортера
  // Сначала находим или создаём системного пользователя
  let systemUser = await prisma.user.findFirst({ where: { email: "system@synapse.internal" } });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        name: "Synapse AI Moderation",
        email: "system@synapse.internal",
        region: "global",
      },
    });
  }

  await prisma.report.create({
    data: {
      reporterId: systemUser.id,
      reportedId: userId,
      reason: "INAPPROPRIATE",
      details: `[AI Moderation] Automatically detected: ${violationTypes}. Source: camera pre-screen.`,
      severity: "HIGH",
      reporterLocale: "en",
    },
  });

  // Также создаём запись в activity log
  await prisma.activityLog.create({
    data: {
      type: "auto_warn",
      message: `AI Moderation: ${violationTypes} detected for user ${userId}`,
      metadata: { userId, violationTypes },
    },
  });
}

/**
 * Получает статистику модерации для пользователя.
 */
export async function getUserModerationStats(userId: string) {
  const logs = await prisma.contentModerationLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalBlocked = logs.filter(l => l.action === "blocked").length;
  const totalWarned = logs.filter(l => l.action === "warned").length;
  const last24h = logs.filter(l => l.createdAt.getTime() > Date.now() - 86400000);

  return {
    totalBlocked,
    totalWarned,
    recentIncidents: last24h.length,
    logs: logs.map(l => ({
      id: l.id,
      type: l.type,
      confidence: l.confidence,
      action: l.action,
      source: l.source,
      createdAt: l.createdAt.getTime(),
    })),
  };
}
