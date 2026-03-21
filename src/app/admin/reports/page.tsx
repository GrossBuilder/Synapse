"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  reason: string;
  description: string;
  status: "pending" | "reviewed" | "resolved" | "dismissed" | "auto-resolved";
  severity: "low" | "medium" | "high" | "critical";
  createdAt: number;
  action?: string;
}

interface RepeatOffender {
  user: { id: string; name: string; status: string; offenseCount: number };
  uniqueReporters: number;
  reportCount: number;
}

interface ReportAbuser {
  user: { id: string; name: string };
  reportCount: number;
}

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  critical: "bg-red-500/15 text-red-400 border-red-500/20",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  reviewed: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  resolved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  dismissed: "bg-gray-500/15 text-gray-400 border-gray-500/20",
  "auto-resolved": "bg-purple-500/15 text-purple-400 border-purple-500/20",
};

const REASON_ICONS: Record<string, string> = {
  spam: "📧",
  harassment: "⚠️",
  inappropriate: "🔞",
  underage: "🚸",
  scam: "🎣",
  other: "📌",
};

const OFFENSE_LABELS: Record<string, { icon: string; color: string }> = {
  warned: { icon: "⚠️", color: "text-amber-400" },
  banned: { icon: "🔴", color: "text-red-400" },
  active: { icon: "🟢", color: "text-emerald-400" },
};

export default function ReportsPage() {
  const { t } = useAdminI18n();

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t("common.justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("common.mAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("common.hAgo")}`;
    return `${Math.floor(diff / 86400)}${t("common.dAgo")}`;
  }

  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [repeatOffenders, setRepeatOffenders] = useState<RepeatOffender[]>([]);
  const [reportAbusers, setReportAbusers] = useState<ReportAbuser[]>([]);
  const [autoResolvedCount, setAutoResolvedCount] = useState(0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(severityFilter !== "all" && { severity: severityFilter }),
      });
      const res = await fetch(`/api/admin/reports?${params}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports);
        setTotal(data.total);
        if (data.autoResolved > 0) setAutoResolvedCount(data.autoResolved);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter, severityFilter]);

  const fetchOffenders = useCallback(async () => {
    try {
      const [offRes, abRes] = await Promise.all([
        fetch("/api/admin/reports?offenders=true"),
        fetch("/api/admin/reports?abusers=true"),
      ]);
      if (offRes.ok) {
        const data = await offRes.json();
        setRepeatOffenders(data.offenders || []);
      }
      if (abRes.ok) {
        const data = await abRes.json();
        setReportAbusers(data.abusers || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchReports();
    fetchOffenders();
    const interval = setInterval(() => { fetchReports(); fetchOffenders(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchReports, fetchOffenders]);

  const autoResolvedTotal = reports.filter(r => r.status === "auto-resolved").length;
  const pendingCount = reports.filter(r => r.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("reports.title")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {t("reports.dashboardDesc")}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-white">{total}</p>
          <p className="text-[11px] text-gray-500">{t("reports.totalReports")}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-amber-400">{pendingCount}</p>
          <p className="text-[11px] text-gray-500">{t("reports.awaitingAction")}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-purple-400">{autoResolvedTotal}</p>
          <p className="text-[11px] text-gray-500">{t("reports.autoProcessed")}</p>
        </div>
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className="text-2xl font-bold text-orange-400">{repeatOffenders.length}</p>
          <p className="text-[11px] text-gray-500">{t("reports.repeatOffenders")}</p>
        </div>
      </div>

      {/* Auto-moderation info */}
      <div className="bg-indigo-900/15 border border-indigo-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🤖</span>
          <h3 className="text-sm font-semibold text-indigo-400">{t("reports.autoModTitle")}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">⚠️</span>
            <span>{t("reports.threshold3")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400">🔴</span>
            <span>{t("reports.threshold5")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-500">💀</span>
            <span>{t("reports.threshold7")}</span>
          </div>
        </div>
      </div>

      {/* Auto-resolved notice */}
      {autoResolvedCount > 0 && (
        <div className="bg-purple-900/15 border border-purple-500/20 rounded-xl p-3 flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <p className="text-sm text-purple-400">
            {autoResolvedCount} {t("reports.autoResolvedNotice")}
          </p>
        </div>
      )}

      {/* Repeat Offenders */}
      {repeatOffenders.length > 0 && (
        <div className="bg-orange-900/10 border border-orange-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔁</span>
            <div>
              <h3 className="text-sm font-semibold text-orange-400">{t("reports.repeatOffenders")}</h3>
              <p className="text-[11px] text-gray-500">{t("reports.repeatOffendersDesc")}</p>
            </div>
          </div>
          <div className="space-y-2">
            {repeatOffenders.slice(0, 10).map(o => {
              const statusInfo = OFFENSE_LABELS[o.user.status] || OFFENSE_LABELS.active;
              return (
                <div
                  key={o.user.id}
                  className="flex items-center justify-between bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5"
                >
                  <div className="flex items-center gap-3">
                    <span>{statusInfo.icon}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{o.user.name}</p>
                      <p className="text-[10px] text-gray-500">
                        {t("reports.offenseCount")}: {o.user.offenseCount}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-center">
                      <p className="text-white font-bold">{o.uniqueReporters}</p>
                      <p className="text-[10px] text-gray-500">{t("reports.uniqueReporters")}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-300 font-medium">{o.reportCount}</p>
                      <p className="text-[10px] text-gray-500">{t("reports.totalReports")}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                      o.user.status === "banned"
                        ? "bg-red-900/20 text-red-400 border-red-500/20"
                        : o.user.status === "warned"
                        ? "bg-amber-900/20 text-amber-400 border-amber-500/20"
                        : "bg-emerald-900/20 text-emerald-400 border-emerald-500/20"
                    }`}>
                      {t(`status.${o.user.status}`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report Abusers */}
      {reportAbusers.length > 0 && (
        <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🚨</span>
            <div>
              <h3 className="text-sm font-semibold text-red-400">{t("reports.reportAbusers")}</h3>
              <p className="text-[11px] text-gray-500">{t("reports.reportAbusersDesc")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reportAbusers.map(a => (
              <span
                key={a.user.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-red-900/20 text-red-400 border-red-500/20"
              >
                {a.user.name}
                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">
                  {a.reportCount} {t("reports.reportsIn7d")}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        {/* Status filter */}
        <div className="flex gap-2">
          {["all", "pending", "auto-resolved", "resolved", "dismissed"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${
                statusFilter === status
                  ? "bg-indigo-600/15 border-indigo-500/20 text-indigo-400"
                  : "bg-gray-900/50 border-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {t(`reportStatus.${status}`)}
            </button>
          ))}
        </div>

        {/* Severity filter */}
        <div className="flex gap-2">
          {["all", "critical", "high", "medium", "low"].map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${
                severityFilter === sev
                  ? "bg-indigo-600/15 border-indigo-500/20 text-indigo-400"
                  : "bg-gray-900/50 border-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {sev === "all" ? t("reports.allSeverity") : t(`severity.${sev}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Log */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-gray-400">{t("reports.noReportsMatch")}</p>
          </div>
        ) : (
          reports.map(report => (
            <div
              key={report.id}
              className={`bg-gray-900/50 border rounded-xl px-5 py-3.5 ${
                report.severity === "critical"
                  ? "border-red-500/30 bg-red-900/10"
                  : "border-gray-800"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-base shrink-0">{REASON_ICONS[report.reason] || "📌"}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-white capitalize">{t(`reason.${report.reason}`)}</span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${SEVERITY_COLORS[report.severity]}`}>
                        {t(`severity.${report.severity}`)}
                      </span>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[report.status]}`}>
                        {t(`reportStatus.${report.status}`)}
                      </span>
                    </div>

                    <p className="text-xs text-gray-400 mt-1 truncate">{report.description}</p>

                    <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                      <span>{report.reporterName} → <span className="text-white font-medium">{report.reportedName}</span></span>
                      <span>·</span>
                      <span>{timeAgo(report.createdAt)}</span>
                      {report.action && (
                        <>
                          <span>·</span>
                          <span className="text-purple-400">{report.action}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
