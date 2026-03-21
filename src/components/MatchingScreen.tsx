"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

interface MatchingScreenProps {
  categoryName: string;
  categoryIcon: string;
  queuePosition: number;
  onCancel: () => void;
}

export default function MatchingScreen({
  categoryName,
  categoryIcon,
  queuePosition,
  onCancel,
}: MatchingScreenProps) {
  const t = useTranslations("matching");
  const messages = t.raw("messages") as string[];
  const [messageIndex, setMessageIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex items-center justify-center">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 text-center max-w-md mx-auto px-6">
        <div className="relative mb-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
            <span className="text-4xl">{categoryIcon}</span>
          </div>
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border-2 border-indigo-500/30 animate-ping" />
          <div className="absolute inset-0 w-24 h-24 mx-auto rounded-full border border-indigo-500/20 animate-ping delay-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">{categoryName}</h2>

        <p className="text-gray-400 mb-6 h-6">
          {messages[messageIndex]}{dots}
        </p>

        {queuePosition > 0 && (
          <div className="mb-8 px-4 py-2 bg-gray-900/80 rounded-full inline-block border border-gray-800">
            <span className="text-sm text-gray-300">
              {t("inQueue")}: <span className="text-indigo-400 font-semibold">{queuePosition}</span> {t("people")}
            </span>
          </div>
        )}

        <div className="mb-8">
          <div className="w-12 h-12 mx-auto border-2 border-gray-800 border-t-indigo-500 rounded-full animate-spin" />
        </div>

        <button
          onClick={onCancel}
          className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-colors text-sm font-medium"
        >
          {t("cancelSearch")}
        </button>
      </div>
    </div>
  );
}
