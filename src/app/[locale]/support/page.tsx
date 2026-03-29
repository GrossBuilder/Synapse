"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import Navbar from "@/components/Navbar";

const SUPPORT_EMAIL = "support@synapse.app";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  adminReply: string | null;
  createdAt: string;
  repliedAt: string | null;
}

export default function SupportPage() {
  const { data: session, status: authStatus } = useSession();
  const t = useTranslations("support");
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [tickets, setTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      fetch("/api/support")
        .then(r => r.json())
        .then(data => {
          if (data.tickets) setTickets(data.tickets);
        })
        .catch(() => {});
    }
  }, [authStatus]);

  if (authStatus === "unauthenticated") {
    router.push("/auth/signin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setError("");

    try {
      const locale = document.documentElement.lang || "en";
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subject.trim(), message: message.trim(), locale }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setSubject("");
        setMessage("");
        if (data.ticket) setTickets(prev => [data.ticket, ...prev]);
      } else {
        setError(data.error || t("sendError"));
      }
    } catch {
      setError(t("sendError"));
    } finally {
      setSending(false);
    }
  };

  const statusColor = (status: string) => {
    if (status === "OPEN") return "bg-amber-500/20 text-amber-400";
    if (status === "REPLIED") return "bg-green-500/20 text-green-400";
    return "bg-gray-500/20 text-gray-400";
  };

  const statusLabel = (status: string) => {
    if (status === "OPEN") return t("statusOpen");
    if (status === "REPLIED") return t("statusReplied");
    return t("statusClosed");
  };

  return (
    <>
      <Navbar />
      <main className="pt-24 pb-12 px-6 max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
          <p className="text-gray-400 text-sm">{t("subtitle")}</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 mt-3 text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {SUPPORT_EMAIL}
          </a>
        </div>

        {/* Success notice */}
        {sent && (
          <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4 flex items-start gap-3">
            <span className="text-green-400 text-lg">✅</span>
            <div>
              <p className="text-sm font-medium text-green-300">{t("sentTitle")}</p>
              <p className="text-xs text-green-400/70 mt-1">{t("sentDesc")}</p>
            </div>
            <button onClick={() => setSent(false)} className="ml-auto text-green-400 hover:text-green-300">
              ✕
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold">{t("newTicket")}</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("subjectLabel")}</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={t("subjectPlaceholder")}
              maxLength={200}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">{t("messageLabel")}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t("messagePlaceholder")}
              maxLength={2000}
              required
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
            <p className="text-xs text-gray-600 mt-1 text-right">{message.length}/2000</p>
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={sending || !subject.trim() || !message.trim()}
            className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
              sending || !subject.trim() || !message.trim()
                ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white"
            }`}
          >
            {sending ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                {t("sending")}
              </>
            ) : (
              t("send")
            )}
          </button>
        </form>

        {/* Previous tickets */}
        {tickets.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{t("myTickets")}</h2>
            {tickets.map(ticket => (
              <div key={ticket.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-medium text-white">{ticket.subject}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor(ticket.status)}`}>
                    {statusLabel(ticket.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-400 whitespace-pre-wrap">{ticket.message}</p>
                <p className="text-xs text-gray-600">
                  {new Date(ticket.createdAt).toLocaleDateString()}
                </p>

                {ticket.adminReply && (
                  <div className="bg-indigo-900/20 border border-indigo-800/40 rounded-lg p-3 mt-2">
                    <p className="text-xs text-indigo-400 font-medium mb-1">{t("adminReply")}</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{ticket.adminReply}</p>
                    {ticket.repliedAt && (
                      <p className="text-xs text-gray-600 mt-1">
                        {new Date(ticket.repliedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
