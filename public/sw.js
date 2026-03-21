// Synapse Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Synapse", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-72.png",
    tag: data.tag || "synapse-notification",
    data: { url: data.url || "/" },
    vibrate: [200, 100, 200],
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Synapse", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Если окно уже открыто — фокусируем
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Иначе — открываем новое
      return self.clients.openWindow(url);
    })
  );
});
