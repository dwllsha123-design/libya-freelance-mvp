'use client';

/**
 * Web Push helpers — registers SW and stores VAPID subscription via API.
 */

type PushApi = {
  pushPublicKey: () => Promise<{ publicKey: string | null }>;
  subscribePush: (body: {
    endpoint: string;
    p256dh: string;
    auth: string;
    deviceType?: string;
    browser?: string;
    userAgent?: string;
  }) => Promise<unknown>;
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

function bufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function registerWebPush(api: PushApi): Promise<string> {
  if (typeof window === 'undefined') {
    return 'Push is only available in the browser.';
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'This browser does not support Web Push.';
  }

  const { publicKey } = await api.pushPublicKey();
  if (!publicKey) {
    return 'Web Push is not configured on the server yet.';
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return 'Notification permission was not granted.';
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Invalid push subscription payload');
  }

  await api.subscribePush({
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    deviceType: 'web',
    browser: navigator.userAgent.includes('Firefox')
      ? 'firefox'
      : navigator.userAgent.includes('Edg')
        ? 'edge'
        : 'chrome',
    userAgent: navigator.userAgent.slice(0, 500),
  });

  void bufferToBase64Url;

  return 'Push notifications enabled.';
}
