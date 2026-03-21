"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface ReportModalProps {
  peerName: string;
  peerId: string;
  sessionId: string;
  onSubmit: (data: { reason: string; description: string }) => void;
  onClose: () => void;
}

const REPORT_REASONS = [
  "spam",
  "harassment",
  "inappropriate",
  "underage",
  "scam",
  "other",
] as const;

export default function ReportModal({
  peerName,
  onSubmit,
  onClose,
}: ReportModalProps) {
  const t = useTranslations("report");
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    onSubmit({ reason, description });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/60" onClick={onClose} />
        <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-8 max-w-sm text-center shadow-2xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">{t("submitted")}</h3>
          <p className="text-sm text-gray-400 mb-5">{t("thankYou")}</p>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm transition-colors"
          >
            {t("close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-white">{t("title")}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-4">
          {t("reporting")} <span className="text-white font-medium">{peerName}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reasons */}
          <div className="space-y-2">
            {REPORT_REASONS.map((r) => (
              <label
                key={r}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors border
                  ${reason === r
                    ? "bg-red-500/10 border-red-500/40 text-white"
                    : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800"
                  }
                `}
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${reason === r ? "border-red-500" : "border-gray-600"}`}>
                  {reason === r && <div className="w-2 h-2 rounded-full bg-red-500" />}
                </div>
                <span className="text-sm">{t(`reasons.${r}`)}</span>
              </label>
            ))}
          </div>

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 resize-none"
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!reason}
              className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors"
            >
              {t("submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
