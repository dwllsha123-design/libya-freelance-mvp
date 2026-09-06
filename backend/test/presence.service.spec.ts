import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PresenceVisibility, Role } from '@prisma/client';
import { PresenceService } from '../src/presence/presence.service.js';
import { presenceOfflineGraceMs } from '../src/presence/presence.constants.js';

function createService(opts?: { redisConfigured?: boolean; redisUp?: boolean }) {
  const redisConfigured = opts?.redisConfigured ?? false;
  const redisUp = opts?.redisUp ?? false;

  const prisma = {
    user: {
      update: vi.fn(async ({ where }: { where: { id: string } }) => ({
        lastSeenAt: new Date('2026-01-01T12:00:00.000Z'),
        id: where.id,
      })),
      findMany: vi.fn(
        async ({ where }: { where: { id: { in: string[] } } }) =>
          where.id.in.map((id: string) => ({
            id,
            lastSeenAt: null as Date | null,
            presenceVisibility: PresenceVisibility.EVERYONE,
            role: Role.FREELANCER,
          })),
      ),
      count: vi.fn(async () => 0),
    },
  };

  const redis = {
    isConfigured: () => redisConfigured,
    isAvailable: () => redisConfigured && redisUp,
    allowsMemoryPresenceFallback: () => !redisConfigured,
    getClient: () => null,
  };

  const service = new PresenceService(redis as never, prisma as never);
  return { service, prisma, redis };
}

describe('PresenceService (in-memory)', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('single socket => ONLINE', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('second socket => remains ONLINE', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.registerConnection('u1', 's2', Role.FREELANCER);
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('first socket disconnect => remains ONLINE', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.registerConnection('u1', 's2', Role.FREELANCER);
    await service.unregisterConnection('u1', 's1');
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('final socket disconnect => OFFLINE after grace and updates lastSeenAt', async () => {
    vi.useFakeTimers();
    const { service, prisma } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.unregisterConnection('u1', 's1');

    expect(await service.isOnline('u1')).toBe(true);

    await vi.advanceTimersByTimeAsync(presenceOfflineGraceMs() + 50);

    expect(await service.isOnline('u1')).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'u1' },
        data: expect.objectContaining({ lastSeenAt: expect.any(Date) }),
      }),
    );
  });

  it('reconnect during grace cancels stale OFFLINE timer', async () => {
    vi.useFakeTimers();
    const { service, prisma } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.unregisterConnection('u1', 's1');

    // Reconnect before grace ends
    await service.registerConnection('u1', 's2', Role.FREELANCER);
    await vi.advanceTimersByTimeAsync(presenceOfflineGraceMs() + 50);

    expect(await service.isOnline('u1')).toBe(true);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('heartbeat keeps connection alive in memory', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.CLIENT);
    await service.heartbeat('u1', 's1');
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('cannot spoof another user heartbeat', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.heartbeat('u2', 's1');
    expect(await service.isOnline('u1')).toBe(true);
  });

  it('forceOffline clears presence immediately', async () => {
    const { service, prisma } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.forceOffline('u1');
    expect(await service.isOnline('u1')).toBe(false);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('respects presence privacy NOBODY for non-admin viewers', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockImplementation(async () => [
      {
        id: 'u1',
        lastSeenAt: new Date(),
        presenceVisibility: PresenceVisibility.NOBODY,
        role: Role.FREELANCER,
      },
    ] as never);
    await service.registerConnection('u1', 's1', Role.FREELANCER);

    const hidden = await service.getPresenceBatch(['u1'], {
      id: 'viewer',
      role: Role.CLIENT,
    });
    expect(hidden[0]?.status).toBe('OFFLINE');
    expect(hidden[0]?.lastSeenAt).toBeNull();

    const self = await service.getPresenceBatch(['u1'], {
      id: 'u1',
      role: Role.FREELANCER,
    });
    expect(self[0]?.status).toBe('ONLINE');
  });

  it('CLIENTS_ONLY hides from freelancers and anonymous', async () => {
    const { service, prisma } = createService();
    prisma.user.findMany.mockImplementation(async () => [
      {
        id: 'u1',
        lastSeenAt: new Date(),
        presenceVisibility: PresenceVisibility.CLIENTS_ONLY,
        role: Role.FREELANCER,
      },
    ] as never);
    await service.registerConnection('u1', 's1', Role.FREELANCER);

    const anon = await service.getPresenceBatch(['u1'], null);
    expect(anon[0]?.status).toBe('OFFLINE');
    expect(anon[0]?.lastSeenAt).toBeNull();

    const freelancer = await service.getPresenceBatch(['u1'], {
      id: 'f2',
      role: Role.FREELANCER,
    });
    expect(freelancer[0]?.status).toBe('OFFLINE');

    const client = await service.getPresenceBatch(['u1'], {
      id: 'c1',
      role: Role.CLIENT,
    });
    expect(client[0]?.status).toBe('ONLINE');
  });

  it('Redis configured but down => presence degraded (not ONLINE via memory)', async () => {
    const { service } = createService({ redisConfigured: true, redisUp: false });
    const result = await service.registerConnection('u1', 's1', Role.FREELANCER);
    expect(result.becameOnline).toBe(false);
    expect(await service.isOnline('u1')).toBe(false);
    expect(await service.getOnlineUserIds()).toEqual([]);
  });

  it('resolveStatus maps recent lastSeen to RECENTLY_ACTIVE', () => {
    const { service } = createService();
    const recent = new Date(Date.now() - 60_000);
    expect(service.resolveStatus(false, recent)).toBe('RECENTLY_ACTIVE');
    expect(service.resolveStatus(true, recent)).toBe('ONLINE');
    expect(service.resolveStatus(false, null)).toBe('OFFLINE');
  });

  it('counts one user once despite multiple sockets', async () => {
    const { service } = createService();
    await service.registerConnection('u1', 's1', Role.FREELANCER);
    await service.registerConnection('u1', 's2', Role.FREELANCER);
    expect(await service.countOnline(Role.FREELANCER)).toBe(1);
  });
});
