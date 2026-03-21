"use client";

import { useTranslations } from "next-intl";
import type { SubscriptionPlan } from "@/types";

interface ChatLimitBannerProps {
  used: number;
  limit: number;
  plan: SubscriptionPlan;
  /** Лимит достигнут — показать upsell */
  blocked?: boolean;
  onUpgrade?: () => void;
}

export default function ChatLimitBanner({
  used,
  limit,
  plan,
  blocked = false,
  onUpgrade,
}: ChatLimitBannerProps) {
  const t = useTranslations("subscription");

  // Plus/Pro — не показывать лимит
  if (plan !== "free") return null;

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isLow = percentage >= 70;

  if (blocked) {
    return (
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
        <div className="bg-gray-900 border border-amber-500/50 rounded-2xl p-8 shadow-2xl shadow-amber-500/10 max-w-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t("limitReached")}</h3>
          <p className="text-sm text-gray-400 mb-6">
            {used}/{limit} {t("chatsRemaining").split("{")[0].trim()}
          </p>

          <button
            onClick={onUpgrade}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25"
          >
            {t("upgrade")} — Synapse+ $4.99/{t("perMonth").replace("/", "")}
          </button>
        </div>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/60 -z-10" />
      </div>
    );
  }

  // Мини-индикатор лимита (показываем когда >= 50%)
  if (percentage < 50) return null;

  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium
      ${isLow ? "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30" : "bg-gray-800 text-gray-400"}
    `}>
      <div className="w-14 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${isLow ? "bg-amber-400" : "bg-indigo-400"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span>{used}/{limit}</span>
    </div>
  );
}
