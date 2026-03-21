/**
 * Admin Store — Prisma-backed persistent storage for admin panel.
 * All data persists across server restarts in PostgreSQL.
 */

import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

// ==================== INTERFACE TYPES ====================

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  region: string;
  status: "active" | "banned" | "warned";
  joinedAt: number;
  lastActive: number;
  totalChats: number;
  reportCount: number;
  banReason?: string;
  bannedAt?: number;
  bannedBy?: string;
  trustScore: number;
  trustPool: "trusted" | "regular" | "probation";
  trustBadge: "trusted" | "regular" | "low";
  plan: "free" | "plus" | "pro";
  planExpiresAt?: number;
  totalSpent: number;
  offenseCount: number;
}

export interface AdminReport {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reason: "spam" | "harassment" | "inappropriate" | "underage" | "scam" | "other";
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed" | "auto-resolved";
  severity: "low" | "medium" | "high" | "critical";
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
  action?: string;
  reporterLocale?: string;
  adminResponse?: string;
  adminResponseTranslated?: string;
  respondedAt?: number;
}

export interface AdminSettings {
  autoModeration: boolean;
  autoBanThreshold: number;
  autoWarnThreshold: number;
  maxReportsPerDay: number;
  autoResolveAfterDays: number;
  repeatOffenderMultiplier: boolean;
  chatTimeoutMinutes: number;
  requireEmailVerification: boolean;
  maintenanceMode: boolean;
  maxConcurrentUsers: number;
  minAccountAgeMinutes: number;
  blockedWords: string[];
  allowedRegions: string[];
  featureFlags: {
    videoChat: boolean;
    textChat: boolean;
    fileSharing: boolean;
    screenShare: boolean;
  };
}

export interface SystemMetrics {
  totalUsers: number;
  activeNow: number;
  chatsToday: number;
  chatsTotal: number;
  reportsPending: number;
  reportsToday: number;
  bannedUsers: number;
  avgChatDuration: number;
  peakOnline: number;
  uptime: number;
  trustPoolTrusted: number;
  trustPoolRegular: number;
  trustPoolProbation: number;
  avgTrustScore: number;
  subscribersFree: number;
  subscribersPlus: number;
  subscribersPro: number;
  totalRevenue: number;
}

export interface ActivityLog {
  id: string;
  type: "user_join" | "user_ban" | "user_unban" | "report_created" | "report_resolved" | "chat_started" | "chat_ended" | "settings_changed" | "auto_ban" | "auto_warn" | "payment_confirmed";
  message: string;
  timestamp: number;
  metadata?: Record<string, string>;
}

// ==================== ENUM MAPPINGS ====================

const STATUS_FROM_DB: Record<string, "active" | "banned" | "warned"> = { ACTIVE: "active", WARNED: "warned", BANNED: "banned" };
const REASON_TO_DB = { spam: "SPAM", harassment: "HARASSMENT", inappropriate: "INAPPROPRIATE", underage: "UNDERAGE", scam: "SCAM", other: "OTHER" } as const;
const REASON_FROM_DB: Record<string, AdminReport["reason"]> = { SPAM: "spam", HARASSMENT: "harassment", INAPPROPRIATE: "inappropriate", UNDERAGE: "underage", SCAM: "scam", OTHER: "other" };
const REPORT_STATUS_TO_DB = { pending: "PENDING", reviewed: "REVIEWED", resolved: "RESOLVED", dismissed: "DISMISSED", "auto-resolved": "AUTO_RESOLVED" } as const;
const REPORT_STATUS_FROM_DB: Record<string, AdminReport["status"]> = { PENDING: "pending", REVIEWED: "reviewed", RESOLVED: "resolved", DISMISSED: "dismissed", AUTO_RESOLVED: "auto-resolved" };
const SEVERITY_TO_DB = { low: "LOW", medium: "MEDIUM", high: "HIGH", critical: "CRITICAL" } as const;
const SEVERITY_FROM_DB: Record<string, AdminReport["severity"]> = { LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical" };
const PLAN_FROM_DB: Record<string, "free" | "plus" | "pro"> = { FREE: "free", PLUS: "plus", PRO: "pro" };
const PLAN_TO_DB = { free: "FREE", plus: "PLUS", pro: "PRO" } as const;
const POOL_FROM_DB: Record<string, "trusted" | "regular" | "probation"> = { TRUSTED: "trusted", REGULAR: "regular", PROBATION: "probation" };
const BADGE_FROM_DB: Record<string, "trusted" | "regular" | "low"> = { TRUSTED: "trusted", REGULAR: "regular", LOW: "low" };

// ==================== MAPPERS ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUser(u: any): AdminUser {
  return {
    id: u.id,
    name: u.name || "Unknown",
    email: u.email || "",
    region: u.region,
    status: STATUS_FROM_DB[u.status] || "active",
    joinedAt: u.createdAt.getTime(),
    lastActive: u.lastActive.getTime(),
    totalChats: u.totalChats,
    reportCount: u._count?.reportedBy ?? 0,
    banReason: u.banReason || undefined,
    bannedAt: u.bannedAt?.getTime(),
    bannedBy: u.bannedBy || undefined,
    trustScore: u.trustScore?.score ?? 50,
    trustPool: POOL_FROM_DB[u.trustScore?.pool || "REGULAR"] || "regular",
    trustBadge: BADGE_FROM_DB[u.trustScore?.badge || "REGULAR"] || "regular",
    plan: PLAN_FROM_DB[u.subscription?.plan || "FREE"] || "free",
    planExpiresAt: u.subscription?.expiresAt?.getTime(),
    totalSpent: u.totalSpent,
    offenseCount: u.offenseCount ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapReport(r: any): AdminReport {
  return {
    id: r.id,
    reporterId: r.reporterId,
    reporterName: r.reporter?.name || "Unknown",
    reportedId: r.reportedId,
    reportedName: r.reported?.name || "Unknown",
    reason: REASON_FROM_DB[r.reason] || "other",
    description: r.details || "",
    status: REPORT_STATUS_FROM_DB[r.status] || "pending",
    severity: SEVERITY_FROM_DB[r.severity] || "medium",
    createdAt: r.createdAt.getTime(),
    resolvedAt: r.resolvedAt?.getTime(),
    resolvedBy: r.resolvedBy || undefined,
    action: r.action || undefined,
    reporterLocale: r.reporterLocale || "en",
    adminResponse: r.adminResponse || undefined,
    adminResponseTranslated: r.adminResponseTranslated || undefined,
    respondedAt: r.respondedAt?.getTime(),
  };
}

const USER_INCLUDE = {
  trustScore: { select: { score: true, pool: true, badge: true } },
  subscription: { select: { plan: true, expiresAt: true } },
  _count: { select: { reportedBy: true } },
} as const;

const REPORT_INCLUDE = {
  reporter: { select: { name: true } },
  reported: { select: { name: true } },
} as const;

// ==================== ADMIN STORE ====================

const startTime = Date.now();

class AdminStore {

  // ==================== SETTINGS ====================

  async getSettings(): Promise<AdminSettings> {
    const s = await prisma.adminSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    return {
      autoModeration: s.autoModeration,
      autoBanThreshold: s.autoBanThreshold,
      autoWarnThreshold: s.autoWarnThreshold,
      maxReportsPerDay: s.maxReportsPerDay,
      autoResolveAfterDays: s.autoResolveAfterDays,
      repeatOffenderMultiplier: s.repeatOffenderMultiplier,
      chatTimeoutMinutes: s.chatTimeoutMinutes,
      requireEmailVerification: s.requireEmailVerification,
      maintenanceMode: s.maintenanceMode,
      maxConcurrentUsers: s.maxConcurrentUsers,
      minAccountAgeMinutes: s.minAccountAgeMinutes,
      blockedWords: s.blockedWords,
      allowedRegions: s.allowedRegions,
      featureFlags: {
        videoChat: s.featureVideoChat,
        textChat: s.featureTextChat,
        fileSharing: s.featureFileSharing,
        screenShare: s.featureScreenShare,
      },
    };
  }

  async updateSettings(updates: Partial<AdminSettings>): Promise<AdminSettings> {
    const data: Prisma.AdminSettingsUpdateInput = {};
    if (typeof updates.autoModeration === "boolean") data.autoModeration = updates.autoModeration;
    if (typeof updates.autoBanThreshold === "number") data.autoBanThreshold = updates.autoBanThreshold;
    if (typeof updates.autoWarnThreshold === "number") data.autoWarnThreshold = updates.autoWarnThreshold;
    if (typeof updates.maxReportsPerDay === "number") data.maxReportsPerDay = updates.maxReportsPerDay;
    if (typeof updates.autoResolveAfterDays === "number") data.autoResolveAfterDays = updates.autoResolveAfterDays;
    if (typeof updates.repeatOffenderMultiplier === "boolean") data.repeatOffenderMultiplier = updates.repeatOffenderMultiplier;
    if (typeof updates.chatTimeoutMinutes === "number") data.chatTimeoutMinutes = updates.chatTimeoutMinutes;
    if (typeof updates.requireEmailVerification === "boolean") data.requireEmailVerification = updates.requireEmailVerification;
    if (typeof updates.maintenanceMode === "boolean") data.maintenanceMode = updates.maintenanceMode;
    if (typeof updates.maxConcurrentUsers === "number") data.maxConcurrentUsers = updates.maxConcurrentUsers;
    if (typeof updates.minAccountAgeMinutes === "number") data.minAccountAgeMinutes = updates.minAccountAgeMinutes;
    if (Array.isArray(updates.blockedWords)) data.blockedWords = updates.blockedWords;
    if (Array.isArray(updates.allowedRegions)) data.allowedRegions = updates.allowedRegions;
    if (updates.featureFlags) {
      if (typeof updates.featureFlags.videoChat === "boolean") data.featureVideoChat = updates.featureFlags.videoChat;
      if (typeof updates.featureFlags.textChat === "boolean") data.featureTextChat = updates.featureFlags.textChat;
      if (typeof updates.featureFlags.fileSharing === "boolean") data.featureFileSharing = updates.featureFlags.fileSharing;
      if (typeof updates.featureFlags.screenShare === "boolean") data.featureScreenShare = updates.featureFlags.screenShare;
    }

    // Ensure row exists first
    await prisma.adminSettings.upsert({
      where: { id: "default" },
      create: { id: "default" },
      update: {},
    });
    // Then apply the updates
    await prisma.adminSettings.update({
      where: { id: "default" },
      data,
    });

    await this.addActivity("settings_changed", "Admin settings updated");
    return this.getSettings();
  }

  // ==================== METRICS ====================

  async getMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const [
      totalUsers, activeNow, bannedUsers,
      chatsToday, chatsTotal,
      reportsPending, reportsToday,
      avgDuration, trustPools, subStats, totalRevenue,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActive: { gte: fiveMinAgo } } }),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.chatSession.count({ where: { startedAt: { gte: todayStart } } }),
      prisma.chatSession.count(),
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.report.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.chatSession.aggregate({ _avg: { duration: true } }),
      prisma.trustScore.groupBy({ by: ["pool"], _count: true }),
      prisma.subscription.groupBy({ by: ["plan"], _count: true }),
      prisma.payment.aggregate({ where: { status: "COMPLETED" }, _sum: { amount: true } }),
    ]);

    const poolMap: Record<string, number> = {};
    for (const p of trustPools) poolMap[p.pool] = p._count;
    const subMap: Record<string, number> = {};
    for (const s of subStats) subMap[s.plan] = s._count;
    const avgScore = await prisma.trustScore.aggregate({ _avg: { score: true } });

    return {
      totalUsers,
      activeNow,
      chatsToday,
      chatsTotal,
      reportsPending,
      reportsToday,
      bannedUsers,
      avgChatDuration: avgDuration._avg?.duration || 0,
      peakOnline: activeNow,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      trustPoolTrusted: poolMap["TRUSTED"] || 0,
      trustPoolRegular: poolMap["REGULAR"] || 0,
      trustPoolProbation: poolMap["PROBATION"] || 0,
      avgTrustScore: Math.round(avgScore._avg?.score || 0),
      subscribersFree: totalUsers - (subMap["PLUS"] || 0) - (subMap["PRO"] || 0),
      subscribersPlus: subMap["PLUS"] || 0,
      subscribersPro: subMap["PRO"] || 0,
      totalRevenue: Math.round((totalRevenue._sum?.amount || 0) * 100) / 100,
    };
  }

  // ==================== USERS ====================

  async getUsers(options: {
    search?: string; status?: string; region?: string; page?: number; limit?: number;
  }): Promise<{ users: AdminUser[]; total: number; page: number; totalPages: number }> {
    const { search, status = "all", region = "all", page = 1, limit = 20 } = options;
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { id: { contains: search } },
      ];
    }
    if (status !== "all" && status in { active: 1, warned: 1, banned: 1 }) {
      where.status = status.toUpperCase() as "ACTIVE" | "WARNED" | "BANNED";
    }
    if (region !== "all") where.region = region;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where, include: USER_INCLUDE,
        orderBy: { lastActive: "desc" },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users.map(mapUser),
      total, page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async banUser(userId: string, reason: string): Promise<AdminUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: "BANNED", banReason: reason, bannedAt: new Date(), bannedBy: "admin" },
        include: USER_INCLUDE,
      });
      await this.addActivity("user_ban", `User ${user.name} banned: ${reason}`);
      return mapUser(user);
    } catch { return null; }
  }

  async unbanUser(userId: string): Promise<AdminUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: "ACTIVE", banReason: null, bannedAt: null, bannedBy: null },
        include: USER_INCLUDE,
      });
      await this.addActivity("user_unban", `User ${user.name} unbanned`);
      return mapUser(user);
    } catch { return null; }
  }

  async warnUser(userId: string): Promise<AdminUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: "WARNED" },
        include: USER_INCLUDE,
      });
      await this.addActivity("auto_warn", `Warning issued to ${user.name}`);
      return mapUser(user);
    } catch { return null; }
  }

  async unwarnUser(userId: string): Promise<AdminUser | null> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { status: "ACTIVE" },
        include: USER_INCLUDE,
      });
      await this.addActivity("user_unban", `Warning removed from ${user.name}`);
      return mapUser(user);
    } catch { return null; }
  }

  async deleteUser(userId: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      if (!user) return false;

      // Delete related data in correct order
      await prisma.$transaction([
        prisma.sessionBehavior.deleteMany({ where: { userId } }),
        prisma.dailyUsage.deleteMany({ where: { userId } }),
        prisma.boost.deleteMany({ where: { userId } }),
        prisma.payment.deleteMany({ where: { userId } }),
        prisma.rating.deleteMany({ where: { OR: [{ raterId: userId }, { ratedId: userId }] } }),
        prisma.report.deleteMany({ where: { OR: [{ reporterId: userId }, { reportedId: userId }] } }),
        prisma.chatSession.deleteMany({ where: { OR: [{ senderId: userId }, { receiverId: userId }] } }),
        prisma.userInterest.deleteMany({ where: { userId } }),
        prisma.userTag.deleteMany({ where: { userId } }),
        prisma.trustScore.deleteMany({ where: { userId } }),
        prisma.subscription.deleteMany({ where: { userId } }),
        prisma.session.deleteMany({ where: { userId } }),
        prisma.account.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);

      await this.addActivity("user_ban", `User ${user.name} (${user.email}) account deleted by admin`);
      return true;
    } catch { return false; }
  }

  // ==================== REPORTS ====================

  async getReports(options: { status?: string; severity?: string }) {
    const autoResolved = await this.autoResolveOldReports();
    const where: Prisma.ReportWhereInput = {};
    if (options.status && options.status !== "all") {
      const key = options.status as keyof typeof REPORT_STATUS_TO_DB;
      if (REPORT_STATUS_TO_DB[key]) where.status = REPORT_STATUS_TO_DB[key] as Prisma.EnumReportStatusFilter;
    }
    if (options.severity && options.severity !== "all") {
      const key = options.severity as keyof typeof SEVERITY_TO_DB;
      if (SEVERITY_TO_DB[key]) where.severity = SEVERITY_TO_DB[key] as Prisma.EnumReportSeverityFilter;
    }

    const reports = await prisma.report.findMany({
      where, include: REPORT_INCLUDE, orderBy: { createdAt: "desc" },
    });
    return { reports: reports.map(mapReport), total: reports.length, autoResolved };
  }

  async resolveReport(reportId: string, action: string): Promise<AdminReport | null> {
    try {
      const report = await prisma.report.update({
        where: { id: reportId },
        data: { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: "system", action },
        include: REPORT_INCLUDE,
      });
      await this.addActivity("report_resolved", `Report resolved: ${action}`);
      return mapReport(report);
    } catch { return null; }
  }

  async dismissReport(reportId: string): Promise<AdminReport | null> {
    try {
      const report = await prisma.report.update({
        where: { id: reportId },
        data: { status: "DISMISSED", resolvedAt: new Date(), resolvedBy: "admin" },
        include: REPORT_INCLUDE,
      });
      return mapReport(report);
    } catch { return null; }
  }

  async respondToReport(reportId: string, response: string, translatedResponse?: string): Promise<AdminReport | null> {
    try {
      const report = await prisma.report.update({
        where: { id: reportId },
        data: { adminResponse: response, adminResponseTranslated: translatedResponse, respondedAt: new Date() },
        include: REPORT_INCLUDE,
      });
      const mapped = mapReport(report);
      await this.addActivity("report_resolved", `Admin responded to report from ${mapped.reporterName}`);
      return mapped;
    } catch { return null; }
  }

  async findReport(reportId: string): Promise<AdminReport | null> {
    const report = await prisma.report.findUnique({ where: { id: reportId }, include: REPORT_INCLUDE });
    return report ? mapReport(report) : null;
  }

  async createReport(data: {
    reporterId: string; reportedId: string; reason: string; description: string; reporterLocale?: string;
  }): Promise<{ report: AdminReport; blockedWords: string[]; remaining: number; autoAction?: string } | null> {
    const settings = await this.getSettings();
    const { allowed, remaining } = await this.canUserReport(data.reporterId);
    if (!allowed) return null;

    const { filtered, blocked } = this.filterBlockedWords(data.description, settings.blockedWords);
    const reasonKey = data.reason as keyof typeof REASON_TO_DB;
    const severity = data.reason === "underage" ? "CRITICAL" : data.reason === "harassment" ? "HIGH" : data.reason === "spam" ? "LOW" : "MEDIUM";

    const report = await prisma.report.create({
      data: {
        reporterId: data.reporterId, reportedId: data.reportedId,
        reason: (REASON_TO_DB[reasonKey] || "OTHER") as "SPAM" | "HARASSMENT" | "INAPPROPRIATE" | "UNDERAGE" | "SCAM" | "OTHER",
        details: filtered,
        severity: severity as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        reporterLocale: data.reporterLocale || "en",
      },
      include: REPORT_INCLUDE,
    });

    await this.addActivity("report_created", `New report: ${data.reason}`);

    // === АВТОМАТИЧЕСКАЯ МОДЕРАЦИЯ ===
    // Подсчёт уникальных жалобщиков (без абьюзеров жалоб).
    // Пороги: 3 уникальных → warn, 5 → ban, 7+ → delete.
    let autoAction: string | undefined;

    if (settings.autoModeration) {
      const uniqueCount = await this.getUniqueReporterCount(data.reportedId);
      const user = await prisma.user.findUnique({ where: { id: data.reportedId } });

      if (user) {
        let punishment: "warned" | "banned" | "deleted" | null = null;

        if (uniqueCount >= 7 && user.offenseCount < 3) {
          punishment = await this.applyProgressivePunishment(data.reportedId, 3);
          autoAction = "deleted";
        } else if (uniqueCount >= 5 && user.offenseCount < 2 && user.status !== "BANNED") {
          punishment = await this.applyProgressivePunishment(data.reportedId, 2);
          autoAction = "banned";
        } else if (uniqueCount >= 3 && user.offenseCount < 1 && user.status === "ACTIVE") {
          punishment = await this.applyProgressivePunishment(data.reportedId, 1);
          autoAction = "warned";
        }

        // Авто-resolve всех pending жалоб при действии
        if (punishment) {
          await prisma.report.updateMany({
            where: { reportedId: data.reportedId, status: "PENDING" },
            data: {
              status: "AUTO_RESOLVED",
              resolvedAt: new Date(),
              resolvedBy: "system",
              action: `Auto: ${punishment} (${uniqueCount} unique reporters)`,
            },
          });
        }
      }
    }

    return { report: mapReport(report), blockedWords: blocked, remaining: remaining - 1, autoAction };
  }

  /**
   * Прогрессивная система наказаний по уникальным жалобщикам:
   *   targetOffense 1 (3+ уникальных) → Предупреждение (WARNED)
   *   targetOffense 2 (5+ уникальных) → Бан + сброс Trust Score + отмена подписки
   *   targetOffense 3 (7+ уникальных) → Полное удаление аккаунта
   */
  async applyProgressivePunishment(userId: string, targetOffense: number): Promise<"warned" | "banned" | "deleted" | null> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    if (targetOffense >= 3) {
      await this.addActivity("auto_ban", `Auto-moderation: ${user.name} (${userId}) deleted — 7+ unique reporters`);
      await this.deleteUser(userId);
      return "deleted";
    }

    if (targetOffense === 2) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          status: "BANNED",
          offenseCount: 2,
          banReason: "Auto-banned: 5+ unique reporters",
          bannedAt: new Date(),
          bannedBy: "system",
        },
      });
      await prisma.trustScore.updateMany({
        where: { userId },
        data: { score: 0, pool: "PROBATION", badge: "LOW" },
      });
      await prisma.subscription.updateMany({
        where: { userId, status: "ACTIVE" },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
      await this.addActivity("auto_ban", `Auto-ban: ${user.name} — 5+ unique reporters, trust reset, subscription cancelled`);
      return "banned";
    }

    // targetOffense === 1
    await prisma.user.update({
      where: { id: userId },
      data: { status: "WARNED", offenseCount: 1 },
    });
    await prisma.trustScore.updateMany({
      where: { userId },
      data: { score: { decrement: 15 } },
    });
    const ts = await prisma.trustScore.findUnique({ where: { userId } });
    if (ts) {
      const pool = ts.score >= 70 ? "TRUSTED" : ts.score >= 30 ? "REGULAR" : "PROBATION";
      const badge = ts.score >= 70 ? "TRUSTED" : ts.score >= 30 ? "REGULAR" : "LOW";
      await prisma.trustScore.update({ where: { userId }, data: { pool, badge } });
    }
    await this.addActivity("auto_warn", `Auto-warning: ${user.name} — 3+ unique reporters`);
    return "warned";
  }

  /**
   * Подсчёт уникальных жалобщиков (исключая абьюзеров жалоб).
   */
  async getUniqueReporterCount(reportedId: string): Promise<number> {
    const reporters = await prisma.report.findMany({
      where: { reportedId, status: { not: "DISMISSED" } },
      select: { reporterId: true },
      distinct: ["reporterId"],
    });

    let validCount = 0;
    for (const r of reporters) {
      const isAbuser = await this.isReportAbuser(r.reporterId);
      if (!isAbuser) validCount++;
    }
    return validCount;
  }

  /**
   * Абьюзер жалоб = подал >10 жалоб за 7 дней.
   */
  async isReportAbuser(reporterId: string): Promise<boolean> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const count = await prisma.report.count({
      where: { reporterId, createdAt: { gte: sevenDaysAgo } },
    });
    return count > 10;
  }

  /**
   * Список абьюзеров жалоб для дашборда.
   */
  async getReportAbusers(): Promise<Array<{ user: AdminUser; reportCount: number }>> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
    const reporters = await prisma.report.groupBy({
      by: ["reporterId"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: true,
      having: { reporterId: { _count: { gte: 10 } } },
      orderBy: { _count: { reporterId: "desc" } },
    });

    const result = [];
    for (const r of reporters) {
      const user = await prisma.user.findUnique({ where: { id: r.reporterId }, include: USER_INCLUDE });
      if (user) result.push({ user: mapUser(user), reportCount: r._count });
    }
    return result;
  }

  async canUserReport(reporterId: string): Promise<{ allowed: boolean; remaining: number }> {
    const settings = await this.getSettings();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayReports = await prisma.report.count({
      where: { reporterId, createdAt: { gte: todayStart } },
    });
    return { allowed: todayReports < settings.maxReportsPerDay, remaining: Math.max(0, settings.maxReportsPerDay - todayReports) };
  }

  filterBlockedWords(text: string, blockedWords: string[]): { filtered: string; blocked: string[] } {
    const blocked: string[] = [];
    let filtered = text;
    for (const word of blockedWords) {
      const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      if (regex.test(filtered)) {
        blocked.push(word);
        filtered = filtered.replace(regex, "***");
      }
    }
    return { filtered, blocked };
  }

  async autoResolveOldReports(): Promise<number> {
    const settings = await this.getSettings();
    if (settings.autoResolveAfterDays <= 0) return 0;
    const cutoff = new Date(Date.now() - settings.autoResolveAfterDays * 86400000);
    const result = await prisma.report.updateMany({
      where: { status: "PENDING", severity: "LOW", createdAt: { lt: cutoff } },
      data: { status: "AUTO_RESOLVED", resolvedAt: new Date(), resolvedBy: "system", action: `Auto-resolved after ${settings.autoResolveAfterDays}+ days` },
    });
    if (result.count > 0) await this.addActivity("report_resolved", `Auto-resolved ${result.count} old low-severity reports`);
    return result.count;
  }

  async getRepeatOffenders() {
    const allReports = await prisma.report.findMany({
      where: { status: { not: "DISMISSED" } },
      select: { reportedId: true, reporterId: true },
    });

    // Группируем по reportedId, считаем уникальных жалобщиков
    const userReporterMap: Record<string, Set<string>> = {};
    for (const r of allReports) {
      if (!userReporterMap[r.reportedId]) userReporterMap[r.reportedId] = new Set();
      userReporterMap[r.reportedId].add(r.reporterId);
    }

    const offenders = Object.entries(userReporterMap)
      .filter(([, reporters]) => reporters.size >= 2)
      .sort(([, a], [, b]) => b.size - a.size);

    const result = [];
    for (const [reportedId, reporters] of offenders) {
      const user = await prisma.user.findUnique({ where: { id: reportedId }, include: USER_INCLUDE });
      if (!user) continue;
      const totalReports = await prisma.report.count({ where: { reportedId, status: { not: "DISMISSED" } } });
      result.push({
        user: mapUser(user),
        uniqueReporters: reporters.size,
        reportCount: totalReports,
      });
    }
    return result;
  }

  // ==================== ACTIVITY LOG ====================

  async addActivity(type: ActivityLog["type"], message: string, metadata?: Record<string, string>) {
    await prisma.activityLog.create({ data: { type, message, metadata: metadata || undefined } });
  }

  async getActivityLog(limit = 30): Promise<ActivityLog[]> {
    const logs = await prisma.activityLog.findMany({ orderBy: { createdAt: "desc" }, take: limit });
    return logs.map(l => ({
      id: l.id,
      type: l.type as ActivityLog["type"],
      message: l.message,
      timestamp: l.createdAt.getTime(),
      metadata: l.metadata as Record<string, string> | undefined,
    }));
  }

  // ==================== ANALYTICS ====================

  async getAnalytics() {
    const now = Date.now();
    const dailyStats = [];
    for (let i = 13; i >= 0; i--) {
      const dayStart = new Date(now - i * 86400000); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart.getTime() + 86400000);
      const [newUsers, dayReports, chats, activeUsers] = await Promise.all([
        prisma.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.report.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.chatSession.count({ where: { startedAt: { gte: dayStart, lt: dayEnd } } }),
        prisma.user.count({ where: { lastActive: { gte: dayStart, lt: dayEnd } } }),
      ]);
      dailyStats.push({ date: dayStart.toISOString().split("T")[0], newUsers, chats, reports: dayReports, activeUsers });
    }

    const [regionStats, reasonStats] = await Promise.all([
      prisma.user.groupBy({ by: ["region"], _count: true }),
      prisma.report.groupBy({ by: ["reason"], _count: true }),
    ]);

    const regionDistribution: Record<string, number> = {};
    for (const r of regionStats) regionDistribution[r.region] = r._count;
    const reportsByReason: Record<string, number> = {};
    for (const r of reasonStats) reportsByReason[REASON_FROM_DB[r.reason] || r.reason] = r._count;

    return { dailyStats, regionDistribution, reportsByReason };
  }

  // ==================== TRUST SCORE ====================

  async getTrustScore(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
    if (!user) return null;
    const mapped = mapUser(user);
    return { user: mapped, trustScore: mapped.trustScore, pool: mapped.trustPool, badge: mapped.trustBadge };
  }

  async getAllTrustScores() {
    const users = await prisma.user.findMany({
      include: { trustScore: { select: { score: true, pool: true, badge: true } }, _count: { select: { reportedBy: true } } },
    });
    return users.map(u => ({
      userId: u.id, name: u.name || "Unknown",
      score: u.trustScore?.score ?? 50,
      pool: POOL_FROM_DB[u.trustScore?.pool || "REGULAR"] || "regular",
      badge: BADGE_FROM_DB[u.trustScore?.badge || "REGULAR"] || "regular",
      status: STATUS_FROM_DB[u.status] || "active",
      reportCount: u._count.reportedBy,
    }));
  }

  async modifyTrustScore(userId: string, action: "reset" | "boost" | "penalize", amount?: number): Promise<AdminUser | null> {
    const ts = await prisma.trustScore.findUnique({ where: { userId } });
    if (!ts) return null;
    let score = ts.score;
    if (action === "reset") score = 50;
    else if (action === "boost") score = Math.min(100, score + (amount || 10));
    else score = Math.max(0, score - (amount || 10));
    const pool = score >= 70 ? "TRUSTED" : score >= 30 ? "REGULAR" : "PROBATION";
    const badge = score >= 70 ? "TRUSTED" : score >= 30 ? "REGULAR" : "LOW";

    await prisma.trustScore.update({ where: { userId }, data: { score, pool, badge } });
    const user = await prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
    await this.addActivity("settings_changed", `Trust Score ${action} for user ${userId}: now ${score} (${pool.toLowerCase()})`, { userId, action, score: String(score) });
    return user ? mapUser(user) : null;
  }

  // ==================== SUBSCRIPTION ====================

  async changeUserPlan(userId: string, plan: "free" | "plus" | "pro"): Promise<AdminUser | null> {
    const dbPlan = PLAN_TO_DB[plan] as "FREE" | "PLUS" | "PRO";
    const expiresAt = plan !== "free" ? new Date(Date.now() + 30 * 86400000) : null;
    await prisma.subscription.upsert({
      where: { userId },
      create: { userId, plan: dbPlan, expiresAt },
      update: { plan: dbPlan, expiresAt, status: "ACTIVE" },
    });
    const user = await prisma.user.findUnique({ where: { id: userId }, include: USER_INCLUDE });
    if (!user) return null;
    const mapped = mapUser(user);
    await this.addActivity("settings_changed", `Plan changed for ${mapped.name}: → ${plan}`, { userId, newPlan: plan });
    return mapped;
  }
}

// Global singleton
const globalForAdmin = globalThis as unknown as { adminStore?: AdminStore };
export const adminStore = globalForAdmin.adminStore ?? new AdminStore();
if (process.env.NODE_ENV !== "production") globalForAdmin.adminStore = adminStore;
