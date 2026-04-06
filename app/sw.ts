/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching } from "serwist";
import { Serwist, CacheFirst, NetworkFirst, ExpirationPlugin } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (PrecacheEntry | string)[];
};

// 문항 데이터 청크 — CacheFirst (변경 거의 없음, 오프라인 지원)
const questionDataCache: RuntimeCaching = {
  matcher: /\/data\/questions\/.+\.json$/,
  handler: new CacheFirst({
    cacheName: "question-data",
    plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 7 * 24 * 60 * 60 })],
  }),
};

// exam_index.json — NetworkFirst (업데이트 반영)
const indexCache: RuntimeCaching = {
  matcher: /\/data\/exam_index\.json$/,
  handler: new NetworkFirst({
    cacheName: "exam-index",
    plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 24 * 60 * 60 })],
  }),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [questionDataCache, indexCache, ...defaultCache],
});

serwist.addEventListeners();

// Push notification handler
self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {
    title: "JT기출",
    body: "오늘의 학습을 시작하세요!",
    icon: "/icon-192x192.png",
    badge: "/icon-72x72.png",
  };

  event.waitUntil(
    self.registration.showNotification(data.title ?? "JT기출", {
      body: data.body,
      icon: data.icon ?? "/icon-192x192.png",
      badge: data.badge ?? "/icon-72x72.png",
      data: { url: data.url ?? "/" },
    })
  );
});

// Notification click handler
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();
          (client as WindowClient).navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
