export const PRESENCE_TTL_SECONDS = 90;
export const PRESENCE_HEARTBEAT_INTERVAL_MS = 35_000;
/** Default grace; override at runtime via PRESENCE_OFFLINE_GRACE_MS. */
export const PRESENCE_OFFLINE_GRACE_MS_DEFAULT = 10_000;
export function presenceOfflineGraceMs() {
  const raw = process.env.PRESENCE_OFFLINE_GRACE_MS;
  if (raw == null || raw === '') return PRESENCE_OFFLINE_GRACE_MS_DEFAULT;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : PRESENCE_OFFLINE_GRACE_MS_DEFAULT;
}
export const PRESENCE_RECENTLY_ACTIVE_MS = 15 * 60 * 1000;
export const PRESENCE_LOOKUP_MAX_IDS = 50;
export const PRESENCE_SUBSCRIBE_MAX_IDS = 50;
export const PRESENCE_HEARTBEAT_RATE_LIMIT = 4;
export const PRESENCE_HEARTBEAT_RATE_WINDOW_MS = 10_000;
export const PRESENCE_SUBSCRIBE_RATE_LIMIT = 10;
export const PRESENCE_SUBSCRIBE_RATE_WINDOW_MS = 10_000;

export const PRESENCE_UPDATE_EVENT = 'presence:update';
export const PRESENCE_HEARTBEAT_EVENT = 'presence:heartbeat';
export const PRESENCE_SUBSCRIBE_EVENT = 'presence:subscribe';
export const PRESENCE_UNSUBSCRIBE_EVENT = 'presence:unsubscribe';

export function presenceWatchRoom(userId: string) {
  return `presence:user:${userId}`;
}

export function presenceUserSocketsKey(userId: string) {
  return `presence:user:${userId}:sockets`;
}

export function presenceOnlineKey() {
  return 'presence:online';
}

export function presenceOnlineRoleKey(role: string) {
  return `presence:online:role:${role}`;
}

export function presenceConnKey(socketId: string) {
  return `presence:conn:${socketId}`;
}

/** Cross-instance grace marker — TTL = offline grace period. */
export function presencePendingOfflineKey(userId: string) {
  return `presence:pending_offline:${userId}`;
}
