/**
 * Serialize / parse Web Push subscriptions stored in UserDevice.pushToken.
 * No schema migration — WEB subscriptions are JSON strings in pushToken.
 * Postgres TEXT comfortably holds typical subscription JSON (~0.5–2 KB).
 */

export const WEB_PUSH_ENDPOINT_MAX_LEN = 2048;
export const WEB_PUSH_KEY_MAX_LEN = 512;
export const WEB_PUSH_TOKEN_JSON_MAX_LEN = 4096;
export const WEB_PUSH_PREVIEW_MAX_LEN = 120;

export type WebPushSubscriptionPayload = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

export function serializeWebPushSubscription(
  sub: WebPushSubscriptionPayload,
): string {
  const raw = JSON.stringify({
    endpoint: sub.endpoint,
    keys: {
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
    },
  });
  if (raw.length > WEB_PUSH_TOKEN_JSON_MAX_LEN) {
    throw new Error('Web Push subscription payload exceeds size limit');
  }
  return raw;
}

export function parseWebPushSubscription(
  raw: string | null | undefined,
): WebPushSubscriptionPayload | null {
  if (!raw || raw.length > WEB_PUSH_TOKEN_JSON_MAX_LEN) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WebPushSubscriptionPayload>;
    if (
      typeof parsed.endpoint !== 'string' ||
      !parsed.endpoint.startsWith('https://') ||
      parsed.endpoint.length > WEB_PUSH_ENDPOINT_MAX_LEN ||
      typeof parsed.keys?.p256dh !== 'string' ||
      typeof parsed.keys?.auth !== 'string' ||
      !parsed.keys.p256dh ||
      !parsed.keys.auth ||
      parsed.keys.p256dh.length > WEB_PUSH_KEY_MAX_LEN ||
      parsed.keys.auth.length > WEB_PUSH_KEY_MAX_LEN
    ) {
      return null;
    }
    return {
      endpoint: parsed.endpoint,
      keys: {
        p256dh: parsed.keys.p256dh,
        auth: parsed.keys.auth,
      },
    };
  } catch {
    return null;
  }
}

/** Lock-screen friendly preview — never dump full private message bodies */
export function sanitizePushPreview(
  text: string,
  maxLen = WEB_PUSH_PREVIEW_MAX_LEN,
): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLen) return normalized;
  return `${normalized.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

/**
 * Only allow same-origin relative app paths in push click targets.
 * Rejects protocol-relative, absolute external, and path traversal.
 */
export function sanitizeInternalPushPath(
  raw: string | null | undefined,
): string {
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

export function resolvePushVapidConfig(input: {
  publicKey?: string | null;
  privateKey?: string | null;
  subject?: string | null;
}):
  | { enabled: false; reason: string }
  | {
      enabled: true;
      publicKey: string;
      privateKey: string;
      subject: string;
    } {
  const publicKey = input.publicKey?.trim() ?? '';
  const privateKey = input.privateKey?.trim() ?? '';
  const subject = (
    input.subject?.trim() || 'mailto:support@libyanfreelance.ly'
  );

  const anySet = Boolean(publicKey || privateKey || (input.subject?.trim() ?? ''));
  if (!publicKey && !privateKey) {
    return { enabled: false, reason: 'VAPID not configured' };
  }
  if (!publicKey || !privateKey) {
    return {
      enabled: false,
      reason:
        'Incomplete Web Push VAPID config (need PUSH_VAPID_PUBLIC_KEY and PUSH_VAPID_PRIVATE_KEY)',
    };
  }
  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    return {
      enabled: false,
      reason: 'PUSH_VAPID_SUBJECT must be a mailto: or https: contact URI',
    };
  }
  // subject-only without keys already handled; require subject when enabled
  if (!subject) {
    return { enabled: false, reason: 'PUSH_VAPID_SUBJECT missing' };
  }
  void anySet;
  return { enabled: true, publicKey, privateKey, subject };
}
