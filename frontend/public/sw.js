/* Libya Freelance — Web Push service worker (served at /sw.js) */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function sanitizeInternalPath(raw) {
  const fallback = '/notifications';
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/')) return fallback;
  if (trimmed.startsWith('//')) return fallback;
  if (trimmed.includes('\\') || trimmed.includes('..')) return fallback;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return fallback;
  if (trimmed.length > 512) return fallback;
  return trimmed;
}

self.addEventListener('push', (event) => {
  let payload = {
    title: 'ليبي فريلانس',
    body: 'لديك إشعار جديد',
    data: { url: '/notifications' },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      payload = {
        title: parsed.title || payload.title,
        body: parsed.body || payload.body,
        data: {
          url: sanitizeInternalPath(
            (parsed.data && parsed.data.url) || '/notifications',
          ),
        },
      };
    }
  } catch {
    try {
      const text = event.data ? event.data.text() : '';
      if (text) payload.body = text.slice(0, 120);
    } catch {
      /* keep defaults */
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data,
      dir: 'rtl',
      lang: 'ar',
      icon: '/images/design/logo-mark.jpeg',
      badge: '/images/design/logo-mark.jpeg',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = sanitizeInternalPath(
    event.notification.data && event.notification.data.url,
  );
  const url = new URL(targetPath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              return client.navigate(url).then((c) => (c ? c.focus() : client.focus()));
            }
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
        return undefined;
      }),
  );
});
