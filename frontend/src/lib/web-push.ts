'use client';

import { authenticatedRequest, API_BASE_URL } from '@/lib/api';

const SW_PATH = '/sw.js';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isWebPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export async function registerServiceWorkerOnly(): Promise<ServiceWorkerRegistration | null> {
  if (!isWebPushSupported() || !window.isSecureContext) return null;
  const registration = await navigator.serviceWorker.register(SW_PATH, {
    scope: '/',
  });
  await navigator.serviceWorker.ready;
  return registration;
}

async function getVapidPublicKeyFromApi(): Promise<string | null> {
  const url = `${API_BASE_URL}/notifications/push/vapid-public-key`;
  const res = await fetch(url, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { publicKey?: string };
  return data.publicKey ?? null;
}

/**
 * Restores/refreshes subscription when permission is already granted.
 * Does NOT call Notification.requestPermission().
 */
export async function syncWebPushIfGranted(
  accessToken: string,
): Promise<'synced' | 'skipped' | 'unavailable'> {
  if (!isWebPushSupported() || !window.isSecureContext) return 'skipped';
  if (Notification.permission !== 'granted') return 'skipped';

  const publicKey = await getVapidPublicKeyFromApi();
  if (!publicKey) return 'unavailable';

  const registration = await registerServiceWorkerOnly();
  if (!registration) return 'unavailable';

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    return 'unavailable';
  }

  await authenticatedRequest('/notifications/push/subscribe', accessToken, {
    method: 'POST',
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: {
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      },
    }),
  });

  return 'synced';
}

/**
 * Explicit user gesture path — may call Notification.requestPermission().
 */
export async function enableWebPushFromUserGesture(
  accessToken: string,
): Promise<'subscribed' | 'denied' | 'unsupported' | 'unavailable'> {
  if (!isWebPushSupported() || !window.isSecureContext) return 'unsupported';

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return 'denied';

  const result = await syncWebPushIfGranted(accessToken);
  return result === 'synced' ? 'subscribed' : 'unavailable';
}

/** Unlink this browser's subscription for the current user (logout). */
export async function unlinkWebPushOnLogout(
  accessToken: string | null,
): Promise<void> {
  if (!accessToken || !isWebPushSupported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    const endpoint = subscription.endpoint;
    await authenticatedRequest('/notifications/push/subscribe', accessToken, {
      method: 'DELETE',
      body: JSON.stringify({ endpoint }),
    }).catch(() => undefined);
    await subscription.unsubscribe().catch(() => undefined);
  } catch {
    /* best-effort */
  }
}
