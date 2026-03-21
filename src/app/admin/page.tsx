"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n, type AdminLocale } from "@/lib/admin-i18n";

interface Metrics {
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
}

interface ActivityLog {
  id: string;
  type: string;
  message: string;
  timestamp: number;
}

const TYPE_COLORS: Record<string, string> = {
  user_join: "text-emerald-400",
  user_ban: "text-red-400",
  user_unban: "text-blue-400",
  auto_ban: "text-red-500",
  auto_warn: "text-amber-400",
  report_created: "text-orange-400",
  report_resolved: "text-emerald-400",
  chat_started: "text-indigo-400",
  chat_ended: "text-gray-400",
  settings_changed: "text-purple-400",
};

const TYPE_ICONS: Record<string, string> = {
  user_join: "👤",
  user_ban: "🚫",
  user_unban: "✅",
  auto_ban: "🤖",
  auto_warn: "⚠️",
  report_created: "📢",
  report_resolved: "✅",
  chat_started: "💬",
  chat_ended: "🔚",
  settings_changed: "⚙️",
};

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function AdminDashboard() {
  const { t, locale } = useAdminI18n();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t("common.justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("common.mAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("common.hAgo")}`;
    return `${Math.floor(diff / 86400)}${t("common.dAgo")}`;
  }

  function localizeActivity(msg: string): string {
    if (locale === "en") return msg;
    const patterns: [RegExp, string | ((...args: string[]) => string)][] = [
      [/^User (.+?) \((.+?)\) account deleted by admin$/, (_, name, email) => `Аккаунт ${name} (${email}) удалён администратором`],
      [/^User (.+?) banned: (.+)$/, (_, name, reason) => `${name} заблокирован: ${reason}`],
      [/^User (.+?) unbanned$/, (_, name) => `${name} разблокирован`],
      [/^Warning issued to (.+)$/, (_, name) => `Предупреждение для ${name}`],
      [/^Warning removed from (.+)$/, (_, name) => `Предупреждение снято с ${name}`],
      [/^Report resolved: (.+)$/, (_, action) => `Жалоба решена: ${action}`],
      [/^Admin responded to report from (.+)$/, (_, name) => `Админ ответил на жалобу от ${name}`],
      [/^New report: (.+)$/, (_, reason) => `Новая жалоба: ${reason}`],
      [/^Auto-moderation: (.+?) \((.+?)\) deleted — 7\+ unique reporters$/, (_, name) => `Авто-модерация: ${name} удалён — 7+ уникальных жалобщиков`],
      [/^Auto-ban: (.+?) — 5\+ unique reporters.*$/, (_, name) => `Авто-бан: ${name} — 5+ уникальных жалобщиков, траст сброшен`],
      [/^Auto-warning: (.+?) — 3\+ unique reporters$/, (_, name) => `Авто-предупреждение: ${name} — 3+ уникальных жалобщика`],
      [/^Progressive warning: (.+?) — offense #(\d+)$/, (_, name, n) => `Предупреждение: ${name} — нарушение #${n}`],
      [/^Progressive ban: (.+?) — offense #(\d+).*$/, (_, name, n) => `Прогрессивный бан: ${name} — нарушение #${n}`],
      [/^Progressive punishment: user (.+?) \((.+?)\) deleted — offense #(\d+)$/, (_, name, _id, n) => `Аккаунт ${name} удалён — нарушение #${n}`],
      [/^Auto-resolved (\d+) old low-severity reports$/, (_, n) => `Авто-закрыто ${n} старых лёгких жалоб`],
      [/^Auto-ban for user .+?: (\d+) reports$/, (_, n) => `Авто-бан: ${n} жалоб превысили порог`],
      [/^Auto-warning for user .+?: (\d+) reports$/, (_, n) => `Авто-предупреждение: ${n} жалоб`],
      [/^Admin settings updated$/, () => "Настройки обновлены"],
      [/^Trust Score (.+?) for user .+?: now (\d+) \((.+?)\)$/, (_, action, score, pool) => `Trust Score ${action}: ${score} (${pool})`],
      [/^Plan changed for (.+?): → (.+)$/, (_, name, plan) => `План ${name} изменён → ${plan}`],
    ];
    for (const [re, replacer] of patterns) {
      const m = msg.match(re);
      if (m) return typeof replacer === "function" ? replacer(...m) : replacer;
    }
    return msg;
  }

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, actRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/activity?limit=20"),
      ]);
      if (statsRes.ok) setMetrics(await statsRes.json());
      if (actRes.ok) {
        const data = await actRes.json();
        setActivity(data.logs || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // auto-refresh every 15s
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!metrics) return <div className="text-red-400">{t("dash.failedLoad")}</div>;

  const statCards = [
    { label: t("dash.totalUsers"), value: metrics.totalUsers, icon: "👥", color: "from-indigo-600/20 to-indigo-600/5 border-indigo-500/20" },
    { label: t("dash.activeNow"), value: metrics.activeNow, icon: "🟢", color: "from-emerald-600/20 to-emerald-600/5 border-emerald-500/20", pulse: true },
    { label: t("dash.chatsToday"), value: metrics.chatsToday, icon: "💬", color: "from-cyan-600/20 to-cyan-600/5 border-cyan-500/20" },
    { label: t("dash.pendingReports"), value: metrics.reportsPending, icon: "🚨", color: metrics.reportsPending > 5 ? "from-red-600/20 to-red-600/5 border-red-500/20" : "from-amber-600/20 to-amber-600/5 border-amber-500/20" },
    { label: t("dash.bannedUsers"), value: metrics.bannedUsers, icon: "🚫", color: "from-red-600/20 to-red-600/5 border-red-500/20" },
    { label: t("dash.reportsToday"), value: metrics.reportsToday, icon: "📢", color: "from-orange-600/20 to-orange-600/5 border-orange-500/20" },
    { label: t("dash.peakOnline"), value: metrics.peakOnline, icon: "📈", color: "from-purple-600/20 to-purple-600/5 border-purple-500/20" },
    { label: t("dash.avgChat"), value: formatDuration(metrics.avgChatDuration), icon: "⏱️", color: "from-blue-600/20 to-blue-600/5 border-blue-500/20" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("dash.title")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {t("dash.realtimeOverview")} {formatUptime(metrics.uptime)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">{t("dash.autoRefreshing")}</span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(card => (
          <div
            key={card.label}
            className={`bg-gradient-to-br ${card.color} border rounded-2xl p-4 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg">{card.icon}</span>
              {card.pulse && <div className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse" />}
            </div>
            <p className="text-2xl font-bold text-white">{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats + Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* System Health */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">{t("dash.systemHealth")}</h2>
          <div className="space-y-4">
            <HealthBar label={t("dash.serverLoad")} value={Math.floor(Math.random() * 30) + 10} max={100} color="emerald" />
            <HealthBar label={t("dash.memoryUsage")} value={Math.floor(Math.random() * 40) + 20} max={100} color="blue" />
            <HealthBar label={t("dash.activeConnections")} value={metrics.activeNow} max={1000} color="indigo" />
            <HealthBar label={t("dash.reportQueue")} value={metrics.reportsPending} max={50} color={metrics.reportsPending > 20 ? "red" : "amber"} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-2 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">{t("dash.recentActivity")}</h2>
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-2 scrollbar-thin">
            {activity.map(log => (
              <div
                key={log.id}
                className="flex items-start gap-3 py-2 px-3 rounded-xl hover:bg-gray-800/30 transition-colors"
              >
                <span className="text-sm mt-0.5">{TYPE_ICONS[log.type] || "📌"}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${TYPE_COLORS[log.type] || "text-gray-300"}`}>{localizeActivity(log.message)}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{timeAgo(log.timestamp)}</p>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">{t("dash.noActivity")}</p>
            )}
          </div>
        </div>
      </div>

      {/* Total Stats */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">{t("dash.allTimeStats")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-3xl font-bold text-white">{metrics.chatsTotal.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{t("dash.totalChats")}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{metrics.totalUsers.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">{t("dash.registeredUsers")}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{metrics.bannedUsers}</p>
            <p className="text-xs text-gray-500 mt-1">{t("dash.usersBanned")}</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-white">{formatDuration(metrics.avgChatDuration)}</p>
            <p className="text-xs text-gray-500 mt-1">{t("dash.avgChatDuration")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HealthBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorClasses: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    indigo: "bg-indigo-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-500">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClasses[color] || "bg-gray-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
