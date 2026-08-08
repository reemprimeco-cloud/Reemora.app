// Minimal service worker: only handles Web Push. No offline caching —
// keeping this narrow avoids interfering with Next.js's own asset
// loading/versioning.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Reemora", body: event.data.text() };
  }

  const title = payload.title || "Reemora";
  const options = {
    body: payload.body || "",
    icon: "/apple-icon.png",
    badge: "/apple-icon.png",
    data: { url: payload.url || "/admin/registrations" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/admin/registrations";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
