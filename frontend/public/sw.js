/* Libya Freelance Web Push service worker */
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Libya Freelance',
    body: '',
    data: { url: '/notifications' },
  };

  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() };
    }
  } catch {
    /* keep defaults */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Libya Freelance', {
      body: payload.body || '',
      data: payload.data || { url: '/notifications' },
      icon: '/logo-icon.png',
      badge: '/logo-icon.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
      return undefined;
    }),
  );
});
