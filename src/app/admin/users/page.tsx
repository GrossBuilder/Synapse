"use client";

import { useEffect, useState, useCallback } from "react";
import { useAdminI18n } from "@/lib/admin-i18n";
import { translateText, getLangName } from "@/lib/translate";
import type { Lang } from "@/lib/translate";

interface User {
  id: string;
  name: string;
  email: string;
  region: string;
  status: "active" | "banned" | "warned";
  joinedAt: number;
  lastActive: number;
  totalChats: number;
  reportCount: number;
  offenseCount?: number;
  banReason?: string;
  bannedAt?: number;
}

const REGION_VALUES = ["all", "global", "europe", "north-america", "south-america", "asia", "middle-east", "africa", "oceania", "cis"];

const STATUS_BADGES: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  banned: "bg-red-500/15 text-red-400 border-red-500/20",
  warned: "bg-amber-500/15 text-amber-400 border-amber-500/20",
};

export default function UsersPage() {
  const { t } = useAdminI18n();

  function timeAgo(ts: number) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return t("common.justNow");
    if (diff < 3600) return `${Math.floor(diff / 60)}${t("common.mAgo")}`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}${t("common.hAgo")}`;
    return `${Math.floor(diff / 86400)}${t("common.dAgo")}`;
  }

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [targetLang, setTargetLang] = useState<Lang>("en");
  const [translatedReason, setTranslatedReason] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "15",
        ...(search && { search }),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(regionFilter !== "all" && { region: regionFilter }),
      });
      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [page, search, statusFilter, regionFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, regionFilter]);

  async function handleAction(userId: string, action: "ban" | "unban" | "warn" | "unwarn") {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action, reason: banReason || undefined }),
      });
      if (res.ok) {
        setBanReason("");
        setSelectedUser(null);
        setTranslatedReason("");
        await fetchUsers();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  async function handleDelete(userId: string) {
    setActionLoading(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "delete" }),
      });
      if (res.ok) {
        setDeleteConfirmUser(null);
        await fetchUsers();
      }
    } catch { /* ignore */ }
    setActionLoading(null);
  }

  function handleTranslate() {
    if (!banReason.trim()) return;
    const result = translateText(banReason, "ru", targetLang);
    setTranslatedReason(result);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">{t("users.title")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} {t("users.usersTotal")}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t("users.searchPlaceholder")}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          <option value="all">{t("users.allStatus")}</option>
          <option value="active">{t("users.active")}</option>
          <option value="warned">{t("users.warned")}</option>
          <option value="banned">{t("users.banned")}</option>
        </select>
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
        >
          {REGION_VALUES.map(r => <option key={r} value={r}>{r === "all" ? t("users.allRegions") : t(`region.${r}`)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.user")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.region")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.status")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.chats")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.reports")}</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.lastActive")}</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">{t("users.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500 text-sm">{t("users.noUsersFound")}</td></tr>
              ) : (
                users.map(user => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-sm font-medium text-gray-300">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.name}</p>
                          <p className="text-[11px] text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{t(`region.${user.region}`)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_BADGES[user.status]}`}>
                        {t(`status.${user.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{user.totalChats}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${user.reportCount > 2 ? "text-red-400 font-medium" : "text-gray-400"}`}>
                        {user.reportCount}
                      </span>
                      {(user.offenseCount ?? 0) > 0 && (
                        <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          (user.offenseCount ?? 0) >= 2 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                        }`}>
                          ×{user.offenseCount}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{timeAgo(user.lastActive)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {user.status === "banned" ? (
                          <button
                            onClick={() => handleAction(user.id, "unban")}
                            disabled={actionLoading === user.id}
                            className="px-3 py-1 text-xs font-medium bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/25 transition-colors disabled:opacity-50"
                          >
                            {t("users.unban")}
                          </button>
                        ) : (
                          <>
                            {user.status === "warned" && (
                              <button
                                onClick={() => handleAction(user.id, "unwarn")}
                                disabled={actionLoading === user.id}
                                className="px-3 py-1 text-xs font-medium bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/25 transition-colors disabled:opacity-50"
                              >
                                {t("users.unwarn")}
                              </button>
                            )}
                            {user.status !== "warned" && (
                              <button
                                onClick={() => handleAction(user.id, "warn")}
                                disabled={actionLoading === user.id}
                                className="px-3 py-1 text-xs font-medium bg-amber-600/15 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-600/25 transition-colors disabled:opacity-50"
                              >
                                {t("users.warn")}
                              </button>
                            )}
                            <button
                              onClick={() => { setSelectedUser(user); setBanReason(""); setTranslatedReason(""); }}
                              disabled={actionLoading === user.id}
                              className="px-3 py-1 text-xs font-medium bg-red-600/15 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-600/25 transition-colors disabled:opacity-50"
                            >
                              {t("users.ban")}
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
                          title={t("users.deleteAccount")}
                        >
                          🗑️
                        </button>
                        <button
                          onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                          className="px-2 py-1 text-xs text-gray-500 hover:text-white transition-colors"
                        >
                          ···
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              {t("users.page")} {page} {t("users.of")} {totalPages} ({total} {t("users.usersTotal")})
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {t("users.previous")}
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {t("users.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ban Modal */}
      {selectedUser && selectedUser.status !== "banned" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setSelectedUser(null); setTranslatedReason(""); }}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-1">{t("users.banUser")}</h3>
            <p className="text-sm text-gray-400 mb-4">
              {t("users.ban")} <span className="text-white font-medium">{selectedUser.name}</span> ({selectedUser.email})
            </p>
            <textarea
              value={banReason}
              onChange={e => { setBanReason(e.target.value); setTranslatedReason(""); }}
              placeholder={t("users.banReason")}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none h-24"
            />

            {/* Translator */}
            <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700/50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400">{t("users.targetLang")}:</span>
                <select
                  value={targetLang}
                  onChange={e => { setTargetLang(e.target.value as Lang); setTranslatedReason(""); }}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="en">{getLangName("en")}</option>
                  <option value="es">{getLangName("es")}</option>
                  <option value="zh">{getLangName("zh")}</option>
                  <option value="ar">{getLangName("ar")}</option>
                  <option value="ru">{getLangName("ru")}</option>
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={!banReason.trim()}
                  className="ml-auto px-3 py-1 text-xs font-medium bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-600/25 transition-colors disabled:opacity-50"
                >
                  {t("users.translateReason")}
                </button>
              </div>
              {translatedReason && (
                <div className="mt-2">
                  <span className="text-[11px] text-gray-500 uppercase">{t("users.translatedPreview")} ({getLangName(targetLang)}):</span>
                  <p className="text-sm text-indigo-300 mt-1 p-2 bg-gray-900/50 rounded-lg">{translatedReason}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => { setSelectedUser(null); setTranslatedReason(""); }}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t("users.cancel")}
              </button>
              <button
                onClick={() => handleAction(selectedUser.id, "ban")}
                disabled={actionLoading === selectedUser.id}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading === selectedUser.id ? t("users.banning") : t("users.confirmBan")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirmUser(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-1">{t("users.deleteUser")}</h3>
            <p className="text-sm text-gray-400 mb-2">
              <span className="text-white font-medium">{deleteConfirmUser.name}</span> ({deleteConfirmUser.email})
            </p>
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-4">
              ⚠️ {t("users.deleteWarning")}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirmUser(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                {t("users.cancel")}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmUser.id)}
                disabled={actionLoading === deleteConfirmUser.id}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading === deleteConfirmUser.id ? t("users.deleting") : t("users.confirmDelete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Panel */}
      {selectedUser && selectedUser.status === "banned" && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{t("users.userDetails")}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">{t("users.name")}</span><span className="text-white">{selectedUser.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t("users.email")}</span><span className="text-white">{selectedUser.email}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t("users.region")}</span><span className="text-white">{t(`region.${selectedUser.region}`)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t("users.status")}</span><span className={STATUS_BADGES[selectedUser.status].split(" ").filter(c => c.startsWith("text-")).join(" ")}>{t(`status.${selectedUser.status}`)}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t("users.totalChats")}</span><span className="text-white">{selectedUser.totalChats}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">{t("users.reports")}</span><span className="text-white">{selectedUser.reportCount}</span></div>
              {(selectedUser.offenseCount ?? 0) > 0 && (
                <div className="flex justify-between"><span className="text-gray-400">Offenses</span><span className={`font-bold ${(selectedUser.offenseCount ?? 0) >= 2 ? "text-red-400" : "text-amber-400"}`}>{selectedUser.offenseCount} / 3</span></div>
              )}
              <div className="flex justify-between"><span className="text-gray-400">{t("users.joined")}</span><span className="text-white">{new Date(selectedUser.joinedAt).toLocaleDateString()}</span></div>
              {selectedUser.banReason && (
                <div className="flex justify-between"><span className="text-gray-400">{t("users.banReasonLabel")}</span><span className="text-red-400">{selectedUser.banReason}</span></div>
              )}
            </div>
            <button onClick={() => setSelectedUser(null)} className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-white bg-gray-800 rounded-xl transition-colors">
              {t("users.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
