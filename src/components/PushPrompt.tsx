"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushPrompt() {
  const t = useTranslations("push");
  const { isSupported, permission, requestPermission } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Показываем баннер только если поддерживается и ещё не решили
    if (!isSupported || permission !== "default") return;

    // Проверяем localStorage — уже отклоняли?
    const wasDismissed = localStorage.getItem("synapse_push_dismissed");
    if (wasDismissed) return;

    // Задержка 10 сек перед показом
    const timer = setTimeout(() => setVisible(true), 10000);
    return () => clearTimeout(timer);
  }, [isSupported, permission]);

  const handleAllow = async () => {
    await requestPermission();
    setVisible(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    localStorage.setItem("synapse_push_dismissed", "1");
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full mx-4 animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="text-3xl">🔔</div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">{t("title")}</h3>
            <p className="text-xs text-gray-400 mb-3">{t("description")}</p>
            <div className="flex gap-2">
              <button
                onClick={handleAllow}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                {t("allow")}
              </button>
              <button
                onClick={handleDismiss}
                className="px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
              >
                {t("later")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
