import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { moderateFrame, getUserModerationStats, MODERATION_CONFIG } from "@/lib/content-moderation";

/**
 * GET /api/admin/moderation — логи и статистика AI-модерации.
 *   ?userId=xxx — логи конкретного пользователя
 *   без параметров — общая статистика
 */
export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");

  if (userId) {
    const stats = await getUserModerationStats(userId);
    return Response.json(stats);
  }

  // Общая статистика модерации
  const [totalLogs, blocked, warned, last24h, topOffenders] = await Promise.all([
    prisma.contentModerationLog.count(),
    prisma.contentModerationLog.count({ where: { action: "blocked" } }),
    prisma.contentModerationLog.count({ where: { action: "warned" } }),
    prisma.contentModerationLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 86400000) } },
    }),
    prisma.contentModerationLog.groupBy({
      by: ["userId"],
      where: { action: "blocked" },
      _count: true,
      orderBy: { _count: { userId: "desc" } },
      take: 10,
    }),
  ]);

  // Получаем имена топ-нарушителей
  const offenderIds = topOffenders.map(o => o.userId);
  const offenderUsers = await prisma.user.findMany({
    where: { id: { in: offenderIds } },
    select: { id: true, name: true, email: true, status: true, offenseCount: true },
  });
  const offenderMap = new Map(offenderUsers.map(u => [u.id, u]));

  const recentLogs = await prisma.contentModerationLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { user: { select: { name: true } } },
  });

  return Response.json({
    config: {
      provider: MODERATION_CONFIG.provider,
      enabled: MODERATION_CONFIG.enabled,
      blockThreshold: MODERATION_CONFIG.blockThreshold,
      warnThreshold: MODERATION_CONFIG.warnThreshold,
    },
    stats: { totalLogs, blocked, warned, last24h },
    topOffenders: topOffenders.map(o => ({
      userId: o.userId,
      blockedCount: o._count,
      user: offenderMap.get(o.userId) || null,
    })),
    recentLogs: recentLogs.map(l => ({
      id: l.id,
      userId: l.userId,
      userName: l.user?.name || "Unknown",
      type: l.type,
      confidence: l.confidence,
      action: l.action,
      source: l.source,
      createdAt: l.createdAt.getTime(),
    })),
  });
}

/**
 * POST /api/admin/moderation — тестирование модерации.
 *   body: { action: "test-scan", userId: "xxx" }
 *   Создаёт тестовый скан для указанного пользователя.
 */
export async function POST(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const body = await request.json();
  const { action, userId } = body;

  if (action === "test-scan" && userId) {
    // Проверяем что пользователь существует
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true } });
    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    // Запускаем модерацию с фейковым кадром (test-провайдер игнорирует frame)
    const result = await moderateFrame(userId, "dGVzdA==", undefined, "pre-screen");

    return Response.json({
      result,
      user: { id: user.id, name: user.name },
      provider: MODERATION_CONFIG.provider,
    });
  }

  return Response.json({ error: "Invalid action" }, { status: 400 });
}
