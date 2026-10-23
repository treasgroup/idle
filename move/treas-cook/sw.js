// treas.su/cook after the move: the site installed here earlier checks this file for updates. This version removes
// the old copy (caches and itself), so the next visit goes to the start page that moves to shefly.ru.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
  })());
});
