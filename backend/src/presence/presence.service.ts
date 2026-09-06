import { Injectable, Logger } from '@nestjs/common';
import {
  PresenceVisibility,
  Role,
  UserStatus,
} from '@prisma/client';
import type { Server } from 'socket.io';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';
import {
  PRESENCE_HEARTBEAT_RATE_LIMIT,
  PRESENCE_HEARTBEAT_RATE_WINDOW_MS,
  PRESENCE_RECENTLY_ACTIVE_MS,
  PRESENCE_SUBSCRIBE_RATE_LIMIT,
  PRESENCE_SUBSCRIBE_RATE_WINDOW_MS,
  PRESENCE_TTL_SECONDS,
  PRESENCE_UPDATE_EVENT,
  presenceConnKey,
  presenceOfflineGraceMs,
  presenceOnlineKey,
  presenceOnlineRoleKey,
  presencePendingOfflineKey,
  presenceUserSocketsKey,
  presenceWatchRoom,
} from './presence.constants.js';
import type {
  PresenceSnapshot,
  PresenceStatus,
  PresenceUpdatePayload,
} from './presence.types.js';

interface MemoryPresence {
  sockets: Set<string>;
  role: Role;
  heartbeatAt: number;
}

/**
 * Presence is authoritative only via Redis when REDIS_URL is configured.
 * Memory store is used only when Redis was never configured (local/single-instance).
 *
 * CLIENTS_ONLY means: authenticated Role.CLIENT may see presence.
 * Freelancers, anonymous visitors, and other roles cannot (admins always can).
 */
@Injectable()
export class PresenceService {
  private readonly logger = new Logger(PresenceService.name);
  private server: Server | null = null;
  private readonly memory = new Map<string, MemoryPresence>();
  private readonly socketToUser = new Map<string, string>();
  private readonly pendingOffline = new Map<string, NodeJS.Timeout>();
  /** Prevent duplicate lastSeen writes from concurrent lazy finalize. */
  private readonly finalizing = new Set<string>();
  private readonly heartbeatRate = new Map<
    string,
    { count: number; resetAt: number }
  >();
  private readonly subscribeRate = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  setServer(server: Server) {
    this.server = server;
  }

  assertHeartbeatRateLimit(userId: string): boolean {
    return this.consumeRate(
      this.heartbeatRate,
      userId,
      PRESENCE_HEARTBEAT_RATE_LIMIT,
      PRESENCE_HEARTBEAT_RATE_WINDOW_MS,
    );
  }

  assertSubscribeRateLimit(userId: string): boolean {
    return this.consumeRate(
      this.subscribeRate,
      userId,
      PRESENCE_SUBSCRIBE_RATE_LIMIT,
      PRESENCE_SUBSCRIBE_RATE_WINDOW_MS,
    );
  }

  private consumeRate(
    map: Map<string, { count: number; resetAt: number }>,
    userId: string,
    limit: number,
    windowMs: number,
  ): boolean {
    const now = Date.now();
    const entry = map.get(userId);
    if (!entry || now >= entry.resetAt) {
      map.set(userId, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (entry.count >= limit) return false;
    entry.count += 1;
    return true;
  }

  /**
   * When Redis is required but down, presence writes/reads are degraded
   * (never ONLINE from local memory) to avoid multi-replica split-brain.
   */
  private presenceDegraded(): boolean {
    return this.redis.isConfigured() && !this.redis.isAvailable();
  }

  private useMemory(): boolean {
    return this.redis.allowsMemoryPresenceFallback();
  }

  async registerConnection(
    userId: string,
    socketId: string,
    role: Role,
  ): Promise<{ becameOnline: boolean }> {
    this.cancelPendingOffline(userId);

    if (this.presenceDegraded()) {
      this.logger.warn(
        `presence register skipped (Redis degraded) user=${userId}`,
      );
      return { becameOnline: false };
    }

    const redis = this.redis.getClient();
    if (redis) {
      try {
        const key = presenceUserSocketsKey(userId);
        const pendingKey = presencePendingOfflineKey(userId);
        const before = await redis.scard(key);
        const pipeline = redis.pipeline();
        pipeline.del(pendingKey);
        pipeline.sadd(key, socketId);
        pipeline.expire(key, PRESENCE_TTL_SECONDS);
        pipeline.set(
          presenceConnKey(socketId),
          JSON.stringify({ userId, role }),
          'EX',
          PRESENCE_TTL_SECONDS,
        );
        pipeline.sadd(presenceOnlineKey(), userId);
        pipeline.sadd(presenceOnlineRoleKey(role), userId);
        await pipeline.exec();
        const becameOnline = before === 0;
        if (becameOnline) {
          await this.publishUpdate({ userId, status: 'ONLINE' });
        }
        return { becameOnline };
      } catch (error) {
        this.logger.error(
          `presence register redis failed for ${userId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        // Do not fall through to memory when Redis is configured.
        return { becameOnline: false };
      }
    }

    if (!this.useMemory()) {
      return { becameOnline: false };
    }

    let entry = this.memory.get(userId);
    const becameOnline = !entry || entry.sockets.size === 0;
    if (!entry) {
      entry = { sockets: new Set(), role, heartbeatAt: Date.now() };
      this.memory.set(userId, entry);
    }
    entry.sockets.add(socketId);
    entry.role = role;
    entry.heartbeatAt = Date.now();
    this.socketToUser.set(socketId, userId);

    if (becameOnline) {
      await this.publishUpdate({ userId, status: 'ONLINE' });
    }
    return { becameOnline };
  }

  async heartbeat(userId: string, socketId: string): Promise<void> {
    if (this.presenceDegraded()) return;

    const redis = this.redis.getClient();
    if (redis) {
      try {
        const owned = await redis.get(presenceConnKey(socketId));
        if (!owned) return;
        const parsed = JSON.parse(owned) as { userId: string; role: Role };
        if (parsed.userId !== userId) return;

        const pipeline = redis.pipeline();
        pipeline.del(presencePendingOfflineKey(userId));
        pipeline.expire(presenceUserSocketsKey(userId), PRESENCE_TTL_SECONDS);
        pipeline.expire(presenceConnKey(socketId), PRESENCE_TTL_SECONDS);
        pipeline.sadd(presenceOnlineKey(), userId);
        pipeline.sadd(presenceOnlineRoleKey(parsed.role), userId);
        await pipeline.exec();
        return;
      } catch (error) {
        this.logger.error(
          `presence heartbeat redis failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return;
      }
    }

    if (!this.useMemory()) return;
    const entry = this.memory.get(userId);
    if (!entry?.sockets.has(socketId)) return;
    entry.heartbeatAt = Date.now();
  }

  async unregisterConnection(
    userId: string,
    socketId: string,
  ): Promise<{ wentOffline: boolean }> {
    if (this.presenceDegraded()) {
      return { wentOffline: false };
    }

    const redis = this.redis.getClient();
    if (redis) {
      try {
        const key = presenceUserSocketsKey(userId);
        const connRaw = await redis.get(presenceConnKey(socketId));
        const role =
          connRaw != null
            ? (JSON.parse(connRaw) as { role: Role }).role
            : undefined;

        await redis.srem(key, socketId);
        await redis.del(presenceConnKey(socketId));
        const remaining = await redis.scard(key);

        if (remaining > 0) {
          return { wentOffline: false };
        }

        // Keep user in online set during grace; mark pending in Redis (cross-instance).
        const graceSec = Math.max(1, Math.ceil(presenceOfflineGraceMs() / 1000));
        await redis.set(presencePendingOfflineKey(userId), '1', 'EX', graceSec);
        this.scheduleOffline(userId, role);
        return { wentOffline: false };
      } catch (error) {
        this.logger.error(
          `presence unregister redis failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return { wentOffline: false };
      }
    }

    if (!this.useMemory()) {
      return { wentOffline: false };
    }

    const entry = this.memory.get(userId);
    if (!entry) return { wentOffline: false };
    entry.sockets.delete(socketId);
    this.socketToUser.delete(socketId);

    if (entry.sockets.size > 0) {
      return { wentOffline: false };
    }

    this.scheduleOffline(userId, entry.role);
    return { wentOffline: false };
  }

  /** Immediate offline (ban/suspend/force logout) — skips grace period. */
  async forceOffline(userId: string): Promise<void> {
    this.cancelPendingOffline(userId);

    const redis = this.redis.getClient();

    if (redis) {
      try {
        const sockets = await redis.smembers(presenceUserSocketsKey(userId));
        const pipeline = redis.pipeline();
        pipeline.del(presencePendingOfflineKey(userId));
        for (const sid of sockets) {
          pipeline.del(presenceConnKey(sid));
        }
        pipeline.del(presenceUserSocketsKey(userId));
        pipeline.srem(presenceOnlineKey(), userId);
        for (const r of Object.values(Role)) {
          pipeline.srem(presenceOnlineRoleKey(r), userId);
        }
        await pipeline.exec();
      } catch (error) {
        this.logger.error(
          `presence forceOffline redis failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    const mem = this.memory.get(userId);
    if (mem) {
      for (const sid of mem.sockets) {
        this.socketToUser.delete(sid);
      }
      this.memory.delete(userId);
    }

    const lastSeenAt = await this.persistLastSeen(userId);
    await this.publishUpdate({
      userId,
      status: 'OFFLINE',
      lastSeenAt: lastSeenAt?.toISOString() ?? null,
    });
  }

  /**
   * Active connection count (ignores grace window).
   * Used by finalizeOffline re-check to avoid treating "still in online set" as online.
   */
  async hasActiveConnections(userId: string): Promise<boolean> {
    if (this.presenceDegraded()) return false;

    const redis = this.redis.getClient();
    if (redis) {
      try {
        return (await redis.scard(presenceUserSocketsKey(userId))) > 0;
      } catch {
        return false;
      }
    }

    if (!this.useMemory()) return false;
    const entry = this.memory.get(userId);
    return !!entry && entry.sockets.size > 0;
  }

  async isOnline(userId: string): Promise<boolean> {
    if (this.presenceDegraded()) {
      return false;
    }

    if (this.pendingOffline.has(userId)) {
      return true;
    }

    const redis = this.redis.getClient();
    if (redis) {
      try {
        const sockets = await redis.scard(presenceUserSocketsKey(userId));
        if (sockets > 0) return true;

        const pending = await redis.exists(presencePendingOfflineKey(userId));
        if (pending === 1) return true;

        // Lazy finalize: in online set but no sockets and grace expired
        const listed = await redis.sismember(presenceOnlineKey(), userId);
        if (listed === 1) {
          await this.finalizeOffline(userId);
          return false;
        }
        return false;
      } catch {
        return false;
      }
    }

    if (!this.useMemory()) return false;
    this.pruneStaleMemory();
    const entry = this.memory.get(userId);
    return !!entry && entry.sockets.size > 0;
  }

  async getOnlineUserIds(role?: Role): Promise<string[]> {
    if (this.presenceDegraded()) {
      return [];
    }

    const redis = this.redis.getClient();
    if (redis) {
      try {
        const key = role ? presenceOnlineRoleKey(role) : presenceOnlineKey();
        const ids = await redis.smembers(key);
        // Filter to users that are truly online (active or in grace)
        const live: string[] = [];
        for (const id of ids) {
          if (await this.isOnline(id)) live.push(id);
        }
        return live;
      } catch (error) {
        this.logger.error(
          `presence getOnlineUserIds failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        return [];
      }
    }

    if (!this.useMemory()) return [];

    this.pruneStaleMemory();
    const ids: string[] = [];
    for (const [userId, entry] of this.memory) {
      if (entry.sockets.size === 0 && !this.pendingOffline.has(userId)) continue;
      if (role && entry.role !== role) continue;
      ids.push(userId);
    }
    return ids;
  }

  async countOnline(role?: Role): Promise<number> {
    const ids = await this.getOnlineUserIds(role);
    return ids.length;
  }

  async getPresenceBatch(
    userIds: string[],
    viewer: { id: string; role: Role } | null,
  ): Promise<PresenceSnapshot[]> {
    const unique = [...new Set(userIds.filter(Boolean))].slice(0, 50);
    if (unique.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: { id: { in: unique }, status: UserStatus.ACTIVE },
      select: {
        id: true,
        lastSeenAt: true,
        presenceVisibility: true,
        role: true,
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const onlineFlags = await Promise.all(
      unique.map(async (id) => [id, await this.isOnline(id)] as const),
    );
    const onlineMap = new Map(onlineFlags);

    const now = Date.now();
    const result: PresenceSnapshot[] = [];

    for (const id of unique) {
      const user = byId.get(id);
      if (!user) {
        result.push({ userId: id, status: 'OFFLINE', lastSeenAt: null });
        continue;
      }

      if (!this.canViewPresence(viewer, user)) {
        // Privacy: do not leak online/lastSeen
        result.push({ userId: id, status: 'OFFLINE', lastSeenAt: null });
        continue;
      }

      const online = onlineMap.get(id) === true;
      if (online) {
        result.push({ userId: id, status: 'ONLINE', lastSeenAt: null });
        continue;
      }

      const lastSeenAt = user.lastSeenAt;
      const status = this.statusFromLastSeen(lastSeenAt, now);
      result.push({
        userId: id,
        status,
        lastSeenAt: lastSeenAt?.toISOString() ?? null,
      });
    }

    return result;
  }

  resolveStatus(online: boolean, lastSeenAt: Date | null | undefined): PresenceStatus {
    if (online) return 'ONLINE';
    return this.statusFromLastSeen(lastSeenAt ?? null, Date.now());
  }

  /**
   * CLIENTS_ONLY: only authenticated users with role CLIENT (plus self/admins).
   * Freelancer viewers and anonymous visitors cannot see presence.
   */
  canViewPresence(
    viewer: { id: string; role: Role } | null,
    subject: {
      id: string;
      presenceVisibility: PresenceVisibility;
      role: Role;
    },
  ): boolean {
    if (viewer?.id === subject.id) return true;
    if (
      viewer &&
      (viewer.role === Role.ADMIN || viewer.role === Role.SUPER_ADMIN)
    ) {
      return true;
    }

    switch (subject.presenceVisibility) {
      case PresenceVisibility.NOBODY:
        return false;
      case PresenceVisibility.CLIENTS_ONLY:
        return viewer?.role === Role.CLIENT;
      case PresenceVisibility.EVERYONE:
      default:
        return true;
    }
  }

  private statusFromLastSeen(
    lastSeenAt: Date | null,
    now: number,
  ): PresenceStatus {
    if (!lastSeenAt) return 'OFFLINE';
    if (now - lastSeenAt.getTime() <= PRESENCE_RECENTLY_ACTIVE_MS) {
      return 'RECENTLY_ACTIVE';
    }
    return 'OFFLINE';
  }

  private scheduleOffline(userId: string, role?: Role) {
    this.cancelPendingOfflineLocal(userId);
    const timer = setTimeout(() => {
      void this.finalizeOffline(userId, role);
    }, presenceOfflineGraceMs());
    this.pendingOffline.set(userId, timer);
  }

  private cancelPendingOffline(userId: string) {
    this.cancelPendingOfflineLocal(userId);
    const redis = this.redis.getClient();
    if (redis) {
      void redis.del(presencePendingOfflineKey(userId)).catch(() => undefined);
    }
  }

  private cancelPendingOfflineLocal(userId: string) {
    const existing = this.pendingOffline.get(userId);
    if (existing) {
      clearTimeout(existing);
      this.pendingOffline.delete(userId);
    }
  }

  private async finalizeOffline(userId: string, role?: Role) {
    this.pendingOffline.delete(userId);

    if (this.finalizing.has(userId)) return;
    this.finalizing.add(userId);

    try {
      // Critical: re-check ACTIVE CONNECTIONS, not isOnline() (online set may still list user during grace).
      if (await this.hasActiveConnections(userId)) {
        return;
      }

      const redis = this.redis.getClient();
      if (redis) {
        try {
          const pending = await redis.exists(presencePendingOfflineKey(userId));
          // If pending key still exists and grace not expired, another reconnect race —
          // but hasActiveConnections already false; if pending still there, wait for TTL/lazy path
          // unless we're the timer that should clear it.
          // Timer expiry means we should proceed; delete pending and clear online.
          void pending;

          const remaining = await redis.scard(presenceUserSocketsKey(userId));
          if (remaining > 0) return;

          const pipeline = redis.pipeline();
          pipeline.del(presencePendingOfflineKey(userId));
          pipeline.del(presenceUserSocketsKey(userId));
          pipeline.srem(presenceOnlineKey(), userId);
          if (role) pipeline.srem(presenceOnlineRoleKey(role), userId);
          for (const r of Object.values(Role)) {
            pipeline.srem(presenceOnlineRoleKey(r), userId);
          }
          await pipeline.exec();
        } catch (error) {
          this.logger.error(
            `presence finalizeOffline redis failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          return;
        }
      }

      this.memory.delete(userId);

      const lastSeenAt = await this.persistLastSeen(userId);
      await this.publishUpdate({
        userId,
        status: 'OFFLINE',
        lastSeenAt: lastSeenAt?.toISOString() ?? null,
      });
    } finally {
      this.finalizing.delete(userId);
    }
  }

  private async persistLastSeen(userId: string): Promise<Date | null> {
    try {
      const updated = await this.prisma.user.update({
        where: { id: userId },
        data: { lastSeenAt: new Date() },
        select: { lastSeenAt: true },
      });
      return updated.lastSeenAt;
    } catch (error) {
      this.logger.error(
        `failed to persist lastSeenAt for ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private async publishUpdate(payload: PresenceUpdatePayload) {
    if (!this.server) return;
    this.server
      .to(presenceWatchRoom(payload.userId))
      .emit(PRESENCE_UPDATE_EVENT, payload);
  }

  private pruneStaleMemory() {
    const cutoff = Date.now() - PRESENCE_TTL_SECONDS * 1000;
    for (const [userId, entry] of this.memory) {
      if (entry.heartbeatAt < cutoff || entry.sockets.size === 0) {
        if (this.pendingOffline.has(userId)) continue;
        for (const sid of entry.sockets) {
          this.socketToUser.delete(sid);
        }
        this.memory.delete(userId);
      }
    }
  }

  /** Test helper — clear in-memory state. */
  resetForTests() {
    for (const timer of this.pendingOffline.values()) {
      clearTimeout(timer);
    }
    this.pendingOffline.clear();
    this.memory.clear();
    this.socketToUser.clear();
    this.finalizing.clear();
  }
}
