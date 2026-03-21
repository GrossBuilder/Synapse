"use client";

import { useEffect, useState, useCallback } from "react";

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (!supported) return;

    setPermission(Notification.permission);

    // Регистрируем Service Worker
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        setRegistration(reg);
      })
      .catch((err) => {
        console.error("SW registration failed:", err);
      });
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const result = await Notification.requestPermission();
    setPermission(result);
    return result === "granted";
  }, [isSupported]);

  /** Показать локальное push-уведомление (без сервера) */
  const showNotification = useCallback(
    async (title: string, options?: NotificationOptions) => {
      if (permission !== "granted" || !registration) return;
      await registration.showNotification(title, {
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-72.png",
        ...options,
      } as NotificationOptions);
    },
    [permission, registration],
  );

  return {
    isSupported,
    permission,
    registration,
    requestPermission,
    showNotification,
  };
}
