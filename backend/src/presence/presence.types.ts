export type PresenceStatus = 'ONLINE' | 'RECENTLY_ACTIVE' | 'OFFLINE';

export interface PresenceSnapshot {
  userId: string;
  status: PresenceStatus;
  lastSeenAt: string | null;
}

export interface PresenceUpdatePayload {
  userId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeenAt?: string | null;
}
