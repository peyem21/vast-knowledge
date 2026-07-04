/* Service worker for background web-push alerts.
   Receives push messages from the server and shows a notification even when
   no Vast Knowledge tab is open. Payload shape: { events: AlertEvent[] }. */

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  const events = Array.isArray(data.events) ? data.events : [];
  if (!events.length) return;

  // Show one notification per event (deduped by tag).
  const shown = events.slice(0, 5).map((ev) =>
    self.registration.showNotification("🔔 " + (ev.ruleLabel || "Alert"), {
      body: ev.message || "",
      tag: (ev.ruleId || "") + ":" + (ev.tokenAddress || ""),
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: "/token/" + ev.chainId + "/" + ev.tokenAddress },
    })
  );

  event.waitUntil(Promise.all(shown));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
