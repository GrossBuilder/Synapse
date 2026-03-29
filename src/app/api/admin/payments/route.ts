import { NextRequest } from "next/server";
import { getAdminFromRequest, adminUnauthorized } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  if (!(await getAdminFromRequest(request))) return adminUnauthorized();

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
  const status = url.searchParams.get("status") || "all";
  const type = url.searchParams.get("type") || "all";
  const period = url.searchParams.get("period") || "all";

  const where: Record<string, unknown> = {};
  if (status !== "all") where.status = status.toUpperCase();
  if (type !== "all") where.type = type.toUpperCase();

  if (period !== "all") {
    const now = new Date();
    const start = new Date(now);
    if (period === "today") start.setHours(0, 0, 0, 0);
    else if (period === "week") start.setDate(now.getDate() - 7);
    else if (period === "month") start.setMonth(now.getMonth() - 1);
    else if (period === "year") start.setFullYear(now.getFullYear() - 1);
    where.createdAt = { gte: start };
  }

  const [payments, total, stats] = await Promise.all([
    prisma.payment.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where }),
    getPaymentStats(period === "all" ? undefined : (where.createdAt as { gte: Date } | undefined)?.gte),
  ]);

  return Response.json({
    payments: payments.map(p => ({
      id: p.id,
      userId: p.userId,
      userName: p.user.name || "Unknown",
      userEmail: p.user.email || "",
      amount: p.amount,
      currency: p.currency,
      type: p.type,
      method: p.method,
      plan: p.plan,
      billing: p.billing,
      status: p.status,
      externalId: p.externalId,
      failReason: p.failReason,
      ipAddress: p.ipAddress,
      createdAt: p.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
    stats,
  });
}

async function getPaymentStats(since?: Date) {
  const where = since ? { createdAt: { gte: since } } : {};
  const completedWhere = { ...where, status: "COMPLETED" as const };

  const [
    totalRevenue,
    totalPayments,
    completedCount,
    pendingCount,
    failedCount,
    refundedCount,
    byType,
    recentDaily,
  ] = await Promise.all([
    prisma.payment.aggregate({ where: completedWhere, _sum: { amount: true } }),
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { ...where, status: "COMPLETED" } }),
    prisma.payment.count({ where: { ...where, status: "PENDING" } }),
    prisma.payment.count({ where: { ...where, status: "FAILED" } }),
    prisma.payment.count({ where: { ...where, status: "REFUNDED" } }),
    prisma.payment.groupBy({ by: ["type"], where: completedWhere, _sum: { amount: true }, _count: true }),
    getLast30DaysRevenue(),
  ]);

  const subscriptions = await prisma.subscription.groupBy({
    by: ["plan", "status"],
    _count: true,
  });

  const subStats: Record<string, { active: number; cancelled: number; expired: number; total: number }> = {
    PLUS: { active: 0, cancelled: 0, expired: 0, total: 0 },
    PRO: { active: 0, cancelled: 0, expired: 0, total: 0 },
  };

  for (const s of subscriptions) {
    if (s.plan === "FREE") continue;
    const plan = subStats[s.plan];
    if (!plan) continue;
    if (s.status === "ACTIVE") plan.active = s._count;
    else if (s.status === "CANCELLED") plan.cancelled = s._count;
    else if (s.status === "EXPIRED") plan.expired = s._count;
    plan.total += s._count;
  }

  return {
    totalRevenue: Math.round((totalRevenue._sum?.amount || 0) * 100) / 100,
    totalPayments,
    completedCount,
    pendingCount,
    failedCount,
    refundedCount,
    byType: byType.map(t => ({
      type: t.type,
      count: t._count,
      revenue: Math.round((t._sum?.amount || 0) * 100) / 100,
    })),
    subscriptions: subStats,
    dailyRevenue: recentDaily,
  };
}

async function getLast30DaysRevenue() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const payments = await prisma.payment.findMany({
    where: { status: "COMPLETED", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const daily: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    daily[d.toISOString().slice(0, 10)] = 0;
  }

  for (const p of payments) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (daily[key] !== undefined) {
      daily[key] = Math.round((daily[key] + p.amount) * 100) / 100;
    }
  }

  return Object.entries(daily).map(([date, amount]) => ({ date, amount }));
}
