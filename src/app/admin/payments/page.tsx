"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Payment {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  type: string;
  method: string;
  plan: string | null;
  billing: string | null;
  status: string;
  externalId: string | null;
  failReason: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface TypeStat { type: string; count: number; revenue: number; }
interface DailyRevenue { date: string; amount: number; }
interface SubStat { active: number; cancelled: number; expired: number; total: number; }

interface PaymentStats {
  totalRevenue: number;
  totalPayments: number;
  completedCount: number;
  pendingCount: number;
  failedCount: number;
  refundedCount: number;
  byType: TypeStat[];
  subscriptions: Record<string, SubStat>;
  dailyRevenue: DailyRevenue[];
}

interface PaymentsData {
  payments: Payment[];
  total: number;
  page: number;
  totalPages: number;
  stats: PaymentStats;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  REFUNDED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const TYPE_ICONS: Record<string, string> = {
  SUBSCRIPTION: "💎",
  BOOST: "⚡",
  VERIFIED_BADGE: "✅",
};

export default function PaymentsPage() {
  const { t } = useAdminI18n();
  const [data, setData] = useState<PaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20", status: statusFilter, type: typeFilter, period: periodFilter });
      const res = await fetch(`/api/admin/payments?${params}`);
      if (res.ok) setData(await res.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, statusFilter, typeFilter, periodFilter]);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-red-400 p-6">{t("payments.failedLoad")}</p>;
  }

  const { stats } = data;
  const maxRevenue = Math.max(...stats.dailyRevenue.map(d => d.amount), 1);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("payments.title")}</h1>
        <p className="text-sm text-gray-400 mt-1">{t("payments.subtitle")}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard label={t("payments.totalRevenue")} value={`$${stats.totalRevenue.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label={t("payments.completed")} value={String(stats.completedCount)} color="text-emerald-400" />
        <StatCard label={t("payments.pending")} value={String(stats.pendingCount)} color="text-amber-400" />
        <StatCard label={t("payments.failed")} value={String(stats.failedCount)} color="text-red-400" />
        <StatCard label={t("payments.refunded")} value={String(stats.refundedCount)} color="text-blue-400" />
      </div>

      {/* Subscriptions Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {Object.entries(stats.subscriptions).map(([plan, sub]) => (
          <div key={plan} className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">💎</span>
              <h3 className="text-white font-semibold">{plan}</h3>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-emerald-400">{sub.active}</p>
                <p className="text-xs text-gray-400">{t("payments.subActive")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-400">{sub.cancelled}</p>
                <p className="text-xs text-gray-400">{t("payments.subCancelled")}</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">{sub.expired}</p>
                <p className="text-xs text-gray-400">{t("payments.subExpired")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Revenue by Type */}
      {stats.byType.length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-3">{t("payments.revenueByType")}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stats.byType.map(bt => (
              <div key={bt.type} className="flex items-center gap-3 bg-gray-900/50 rounded-xl p-3">
                <span className="text-xl">{TYPE_ICONS[bt.type] || "💰"}</span>
                <div>
                  <p className="text-sm text-gray-300">{t(`payments.type_${bt.type}`)}</p>
                  <p className="text-lg font-bold text-white">${bt.revenue.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">{bt.count} {t("payments.transactions")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 30-Day Revenue Chart */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-5">
        <h3 className="text-white font-semibold mb-4">{t("payments.revenueChart")}</h3>
        <div className="flex items-end gap-[2px] h-40">
          {stats.dailyRevenue.map((d, i) => {
            const height = maxRevenue > 0 ? (d.amount / maxRevenue) * 100 : 0;
            return (
              <div key={i} className="flex-1 group relative flex flex-col items-center justify-end">
                <div
                  className="w-full bg-indigo-500/70 hover:bg-indigo-400 rounded-t transition-all cursor-pointer"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <div className="absolute -top-10 bg-gray-900 border border-gray-700 px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                  {d.date.slice(5)}: ${d.amount}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>{stats.dailyRevenue[0]?.date.slice(5)}</span>
          <span>{stats.dailyRevenue[stats.dailyRevenue.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={periodFilter}
          onChange={e => { setPeriodFilter(e.target.value); setPage(1); }}
          aria-label="Period filter"
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">{t("payments.allTime")}</option>
          <option value="today">{t("payments.today")}</option>
          <option value="week">{t("payments.week")}</option>
          <option value="month">{t("payments.month")}</option>
          <option value="year">{t("payments.year")}</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          aria-label="Status filter"
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">{t("payments.allStatuses")}</option>
          <option value="completed">{t("payments.completed")}</option>
          <option value="pending">{t("payments.pending")}</option>
          <option value="failed">{t("payments.failed")}</option>
          <option value="refunded">{t("payments.refunded")}</option>
        </select>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          aria-label="Type filter"
          className="bg-gray-800 border border-gray-700 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">{t("payments.allTypes")}</option>
          <option value="subscription">{t("payments.type_SUBSCRIPTION")}</option>
          <option value="boost">{t("payments.type_BOOST")}</option>
          <option value="verified_badge">{t("payments.type_VERIFIED_BADGE")}</option>
        </select>
      </div>

      {/* Payments Table */}
      <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">{t("payments.date")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.user")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.type")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.amount")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.status")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.txId")}</th>
                <th className="px-4 py-3 font-medium">{t("payments.failReason")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {data.payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {t("payments.noPayments")}
                  </td>
                </tr>
              ) : (
                data.payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-700/20 transition-colors cursor-pointer" onClick={() => setSelectedPayment(p)}>
                    <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                      {new Date(p.createdAt).toLocaleDateString()} <span className="text-gray-500">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{p.userName}</div>
                      <div className="text-xs text-gray-500">{p.userEmail}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 text-gray-300">
                        {TYPE_ICONS[p.type] || "💰"} {t(`payments.type_${p.type}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-semibold">
                      ${p.amount.toFixed(2)} <span className="text-xs text-gray-500 font-normal">{p.currency}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[p.status] || "text-gray-400"}`}>
                        {t(`payments.status_${p.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs font-mono max-w-[120px] truncate" title={p.externalId || ""}>
                      {p.externalId ? p.externalId.slice(0, 12) + "…" : "—"}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      {p.failReason ? (
                        <span className="text-xs text-red-400 line-clamp-2" title={p.failReason}>{p.failReason}</span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
            <p className="text-sm text-gray-400">
              {t("payments.showing")} {(data.page - 1) * 20 + 1}–{Math.min(data.page * 20, data.total)} {t("payments.of")} {data.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ←
              </button>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page >= data.totalPages}
                className="px-3 py-1.5 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedPayment(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{t("payments.details")}</h3>
              <button onClick={() => setSelectedPayment(null)} className="text-gray-400 hover:text-white text-xl">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <DetailRow label="ID" value={selectedPayment.id} mono />
              <DetailRow label={t("payments.user")} value={`${selectedPayment.userName} (${selectedPayment.userEmail})`} />
              <DetailRow label="User ID" value={selectedPayment.userId} mono />
              <DetailRow label={t("payments.amount")} value={`$${selectedPayment.amount.toFixed(2)} ${selectedPayment.currency}`} highlight />
              <DetailRow label={t("payments.type")} value={`${TYPE_ICONS[selectedPayment.type] || ""} ${t(`payments.type_${selectedPayment.type}`)}`} />
              <DetailRow label={t("payments.method")} value={selectedPayment.method} />
              {selectedPayment.plan && <DetailRow label={t("payments.plan")} value={selectedPayment.plan.toUpperCase()} />}
              {selectedPayment.billing && <DetailRow label={t("payments.billing")} value={selectedPayment.billing} />}
              <DetailRow label={t("payments.status")} value={t(`payments.status_${selectedPayment.status}`)} badge={STATUS_COLORS[selectedPayment.status]} />
              {selectedPayment.externalId && <DetailRow label="TX / External ID" value={selectedPayment.externalId} mono />}
              {selectedPayment.ipAddress && <DetailRow label="IP" value={selectedPayment.ipAddress} mono />}
              {selectedPayment.failReason && <DetailRow label={t("payments.failReason")} value={selectedPayment.failReason} error />}
              <DetailRow label={t("payments.date")} value={new Date(selectedPayment.createdAt).toLocaleString()} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value, mono, highlight, error, badge }: {
  label: string; value: string; mono?: boolean; highlight?: boolean; error?: boolean; badge?: string;
}) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      {badge ? (
        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${badge}`}>{value}</span>
      ) : (
        <span className={`text-right break-all ${
          error ? "text-red-400" : highlight ? "text-emerald-400 font-semibold" : mono ? "font-mono text-gray-300 text-xs" : "text-white"
        }`}>{value}</span>
      )}
    </div>
  );
}
