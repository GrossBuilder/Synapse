"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface Ticket {
  id: string;
  email: string;
  subject: string;
  message: string;
  locale: string;
  status: "OPEN" | "REPLIED" | "CLOSED";
  adminReply: string | null;
  repliedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  user: { id: string; name: string | null; email: string | null } | null;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  REPLIED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-gray-500/15 text-gray-400 border-gray-500/20",
};

export default function AdminSupportPage() {
  const { t } = useAdminI18n();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState({ total: 0, open: 0, replied: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/admin/support?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTickets(data.tickets || []);
        setStats(data.stats || { total: 0, open: 0, replied: 0, closed: 0 });
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchTickets();
  }, [fetchTickets]);

  const handleReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action: "reply", reply: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText("");
        setExpandedId(null);
        fetchTickets();
      }
    } catch { /* ignore */ }
    setReplying(false);
  };

  const handleClose = async (ticketId: string) => {
    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action: "close" }),
      });
      if (res.ok) fetchTickets();
    } catch { /* ignore */ }
  };

  const statCards = [
    { label: t("support.total"), value: stats.total, color: "text-white" },
    { label: t("support.open"), value: stats.open, color: "text-amber-400" },
    { label: t("support.replied"), value: stats.replied, color: "text-emerald-400" },
    { label: t("support.closed"), value: stats.closed, color: "text-gray-400" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("support.title")}</h1>
        <p className="text-sm text-gray-400 mt-1">{t("support.subtitle")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {["all", "OPEN", "REPLIED", "CLOSED"].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {f === "all" ? t("support.filterAll") : t(`support.filter${f.charAt(0) + f.slice(1).toLowerCase()}`)}
            {f === "OPEN" && stats.open > 0 && (
              <span className="ml-1.5 bg-amber-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {stats.open}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Ticket list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">{t("support.loading")}</div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t("support.noTickets")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => (
            <div key={ticket.id} className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
              {/* Ticket header */}
              <button
                onClick={() => {
                  setExpandedId(expandedId === ticket.id ? null : ticket.id);
                  setReplyText(ticket.adminReply || "");
                }}
                className="w-full px-5 py-4 flex items-start gap-4 text-left hover:bg-gray-800/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-sm font-medium text-white truncate">{ticket.subject}</h3>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${STATUS_COLORS[ticket.status]}`}>
                      {t(`support.status${ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{ticket.user?.name || ticket.email}</span>
                    <span>•</span>
                    <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span className="uppercase">{ticket.locale}</span>
                  </div>
                </div>
                <svg className={`w-5 h-5 text-gray-500 shrink-0 transition-transform ${expandedId === ticket.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded content */}
              {expandedId === ticket.id && (
                <div className="px-5 pb-5 space-y-4 border-t border-gray-800">
                  {/* User info */}
                  <div className="pt-4 flex items-center gap-4 text-xs text-gray-400">
                    <span>{t("support.userId")}: {ticket.user?.id || "—"}</span>
                    <span>{t("support.email")}: {ticket.email}</span>
                  </div>

                  {/* Message */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.message}</p>
                  </div>

                  {/* Existing reply */}
                  {ticket.adminReply && ticket.status !== "OPEN" && (
                    <div className="bg-indigo-900/20 border border-indigo-800/30 rounded-lg p-4">
                      <p className="text-xs text-indigo-400 font-medium mb-2">{t("support.previousReply")}</p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.adminReply}</p>
                      {ticket.repliedAt && (
                        <p className="text-xs text-gray-500 mt-2">{new Date(ticket.repliedAt).toLocaleString()}</p>
                      )}
                    </div>
                  )}

                  {/* Reply form */}
                  {ticket.status !== "CLOSED" && (
                    <div className="space-y-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder={t("support.replyPlaceholder")}
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReply(ticket.id)}
                          disabled={replying || !replyText.trim()}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            replying || !replyText.trim()
                              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                              : "bg-indigo-600 hover:bg-indigo-500 text-white"
                          }`}
                        >
                          {replying ? t("support.sending") : t("support.sendReply")}
                        </button>
                        <button
                          onClick={() => handleClose(ticket.id)}
                          className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                          {t("support.closeTicket")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
