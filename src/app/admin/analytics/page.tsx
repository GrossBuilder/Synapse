"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface DailyStat {
  date: string;
  newUsers: number;
  chats: number;
  reports: number;
  activeUsers: number;
}

interface Analytics {
  dailyStats: DailyStat[];
  regionDistribution: Record<string, number>;
  reportsByReason: Record<string, number>;
}

const REGION_LABELS: Record<string, string> = {
  global: "🌍 Global",
  europe: "🇪🇺 Europe",
  "north-america": "🌎 N. America",
  "south-america": "🌎 S. America",
  asia: "🌏 Asia",
  "middle-east": "🕌 Middle East",
  africa: "🌍 Africa",
  oceania: "🏝️ Oceania",
  cis: "🏛️ CIS",
};

const BAR_COLORS = [
  "bg-indigo-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-purple-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-blue-500",
  "bg-orange-500",
  "bg-teal-500",
];

export default function AnalyticsPage() {
  const { t } = useAdminI18n();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"users" | "chats" | "reports">("users");

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-red-400">{t("analytics.failedLoad")}</div>;

  const { dailyStats, regionDistribution, reportsByReason } = data;

  // Chart data
  const chartDataMap: Record<string, number[]> = {
    users: dailyStats.map(d => d.newUsers),
    chats: dailyStats.map(d => d.chats),
    reports: dailyStats.map(d => d.reports),
  };

  const chartData = chartDataMap[chartType];
  const maxValue = Math.max(...chartData, 1);

  // Totals
  const totalNewUsers = dailyStats.reduce((s, d) => s + d.newUsers, 0);
  const totalChats = dailyStats.reduce((s, d) => s + d.chats, 0);
  const totalReports = dailyStats.reduce((s, d) => s + d.reports, 0);
  const avgActive = Math.round(dailyStats.reduce((s, d) => s + d.activeUsers, 0) / dailyStats.length);

  // Region data
  const regionEntries = Object.entries(regionDistribution).sort((a, b) => b[1] - a[1]);
  const regionTotal = regionEntries.reduce((s, [, c]) => s + c, 0);

  // Reports by reason
  const reasonEntries = Object.entries(reportsByReason).sort((a, b) => b[1] - a[1]);
  const reasonTotal = reasonEntries.reduce((s, [, c]) => s + c, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("analytics.title")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("analytics.last14days")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label={t("analytics.newUsers14d")}
          value={totalNewUsers}
          trend={calcTrend(dailyStats.map(d => d.newUsers))}
          color="indigo"
        />
        <SummaryCard
          label={t("analytics.totalChats14d")}
          value={totalChats}
          trend={calcTrend(dailyStats.map(d => d.chats))}
          color="emerald"
        />
        <SummaryCard
          label={t("analytics.reports14d")}
          value={totalReports}
          trend={calcTrend(dailyStats.map(d => d.reports))}
          color="amber"
          invertTrend
        />
        <SummaryCard
          label={t("analytics.avgActiveDay")}
          value={avgActive}
          trend={calcTrend(dailyStats.map(d => d.activeUsers))}
          color="cyan"
        />
      </div>

      {/* Main Chart */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-semibold text-white">{t("analytics.dailyTrends")}</h2>
          <div className="flex gap-1">
            {(["users", "chats", "reports"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setChartType(tab)}
                className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                  chartType === tab
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab === "users" ? t("analytics.users") : tab === "chats" ? t("analytics.chats") : t("analytics.reports")}
              </button>
            ))}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="flex items-end gap-1.5 h-48">
          {chartData.map((value, i) => {
            const height = Math.max((value / maxValue) * 100, 2);
            const date = dailyStats[i].date;
            const day = new Date(date).toLocaleDateString("en-US", { weekday: "short" });
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                {/* Tooltip */}
                <div className="absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-[10px] px-2 py-1 rounded-lg whitespace-nowrap z-10">
                  {date}: {value}
                </div>
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    chartType === "users" ? "bg-indigo-500" : chartType === "chats" ? "bg-emerald-500" : "bg-amber-500"
                  } group-hover:opacity-80`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-[9px] text-gray-600">{day}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Region + Reports */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Region Distribution */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">{t("analytics.regionDistribution")}</h2>
          <div className="space-y-3">
            {regionEntries.map(([region, count], i) => {
              const pct = (count / regionTotal) * 100;
              return (
                <div key={region}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{REGION_LABELS[region] || region}</span>
                    <span className="text-gray-500">{count} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reports by Reason */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-white mb-4">{t("analytics.reportsByReason")}</h2>
          {reasonEntries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">{t("analytics.noReportsData")}</p>
          ) : (
            <div className="space-y-3">
              {reasonEntries.map(([reason, count]) => {
                const pct = (count / reasonTotal) * 100;
                const reasonColors: Record<string, string> = {
                  spam: "bg-gray-500",
                  harassment: "bg-red-500",
                  inappropriate: "bg-orange-500",
                  underage: "bg-pink-500",
                  scam: "bg-amber-500",
                  other: "bg-blue-500",
                };
                return (
                  <div key={reason}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 capitalize">{t(`reason.${reason}`)}</span>
                      <span className="text-gray-500">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${reasonColors[reason] || "bg-gray-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== HELPER COMPONENTS ====================

function SummaryCard({ label, value, trend, color, invertTrend }: {
  label: string;
  value: number;
  trend: number;
  color: string;
  invertTrend?: boolean;
}) {
  const trendUp = invertTrend ? trend < 0 : trend > 0;
  const trendColor = trendUp ? "text-emerald-400" : trend === 0 ? "text-gray-500" : "text-red-400";
  const borderColors: Record<string, string> = {
    indigo: "border-indigo-500/20",
    emerald: "border-emerald-500/20",
    amber: "border-amber-500/20",
    cyan: "border-cyan-500/20",
  };
  const bgColors: Record<string, string> = {
    indigo: "from-indigo-600/15 to-transparent",
    emerald: "from-emerald-600/15 to-transparent",
    amber: "from-amber-600/15 to-transparent",
    cyan: "from-cyan-600/15 to-transparent",
  };

  return (
    <div className={`bg-gradient-to-br ${bgColors[color]} border ${borderColors[color]} rounded-2xl p-4`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
        {trend !== 0 && (
          <span className={`text-xs ${trendColor} mb-0.5`}>
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

function calcTrend(values: number[]): number {
  if (values.length < 4) return 0;
  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const secondHalf = values.slice(mid).reduce((s, v) => s + v, 0) / (values.length - mid);
  if (firstHalf === 0) return 0;
  return Math.round(((secondHalf - firstHalf) / firstHalf) * 100);
}
