import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { DevicePlatform } from '@prisma/client';
import { PushNotificationService } from '../src/notifications/push-notification.service.js';
import { NotificationsService } from '../src/notifications/notifications.service.js';
import {
  parseWebPushSubscription,
  resolvePushVapidConfig,
  sanitizeInternalPushPath,
  sanitizePushPreview,
  serializeWebPushSubscription,
} from '../src/notifications/web-push-subscription.util.js';

const { sendNotificationMock, setVapidDetailsMock } = vi.hoisted(() => ({
  sendNotificationMock: vi.fn(),
  setVapidDetailsMock: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: setVapidDetailsMock,
    sendNotification: sendNotificationMock,
  },
}));

function makeConfig(values: Record<string, string | undefined> = {}) {
  return {
    get: (key: string) => values[key],
  } as unknown as ConfigService;
}

describe('web push hardening utilities', () => {
  it('defaults VAPID subject to support mailbox', () => {
    const resolved = resolvePushVapidConfig({
      publicKey: 'pub',
      privateKey: 'priv',
    });
    expect(resolved.enabled).toBe(true);
    if (resolved.enabled) {
      expect(resolved.subject).toBe('mailto:support@libyanfreelance.ly');
    }
  });

  it('disables (does not throw) when VAPID incomplete', () => {
    const resolved = resolvePushVapidConfig({ publicKey: 'only-public' });
    expect(resolved.enabled).toBe(false);
  });

  it('sanitizes lock-screen previews', () => {
    expect(sanitizePushPreview('a'.repeat(200)).length).toBeLessThanOrEqual(120);
  });

  it('allows only internal push click paths', () => {
    expect(sanitizeInternalPushPath('/messages/abc')).toBe('/messages/abc');
    expect(sanitizeInternalPushPath('https://evil.example')).toBe('/notifications');
    expect(sanitizeInternalPushPath('//evil.example')).toBe('/notifications');
    expect(sanitizeInternalPushPath('/../etc/passwd')).toBe('/notifications');
  });
});

describe('PushNotificationService Web Push', () => {
  const subA = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/device-a',
    keys: { p256dh: 'p256-a', auth: 'auth-a' },
  };
  const subB = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/device-b',
    keys: { p256dh: 'p256-b', auth: 'auth-b' },
  };

  let prisma: {
    userDevice: {
      findMany: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
    };
  };
  let service: PushNotificationService;

  beforeEach(() => {
    sendNotificationMock.mockReset();
    setVapidDetailsMock.mockReset();
    sendNotificationMock.mockResolvedValue({});

    prisma = {
      userDevice: {
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };

    service = new PushNotificationService(
      prisma as never,
      makeConfig({
        'push.vapidPublicKey': 'public-key',
        'push.vapidPrivateKey': 'private-key',
        'push.vapidSubject': 'mailto:support@libyanfreelance.ly',
      }),
    );
    service.onModuleInit();
  });

  it('subscribes a WEB device for an authenticated user flow', async () => {
    prisma.userDevice.findMany.mockResolvedValue([]);
    prisma.userDevice.create.mockResolvedValue({
      id: 'd1',
      platform: DevicePlatform.WEB,
    });

    const result = await service.subscribeWebPush('user-1', subA);
    expect(result.id).toBe('d1');
    expect(prisma.userDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          platform: DevicePlatform.WEB,
        }),
      }),
    );
  });

  it('keeps multiple WEB endpoints for the same user (multi-device)', async () => {
    prisma.userDevice.findMany.mockResolvedValue([
      {
        id: 'd1',
        pushToken: serializeWebPushSubscription(subA),
      },
    ]);
    prisma.userDevice.create.mockResolvedValue({
      id: 'd2',
      platform: DevicePlatform.WEB,
    });

    const result = await service.subscribeWebPush('user-1', subB);
    expect(result.id).toBe('d2');
    expect(prisma.userDevice.create).toHaveBeenCalledOnce();
  });

  it('is idempotent for the same endpoint', async () => {
    prisma.userDevice.findMany.mockResolvedValue([
      {
        id: 'd1',
        pushToken: serializeWebPushSubscription(subA),
      },
    ]);
    prisma.userDevice.update.mockResolvedValue({
      id: 'd1',
      platform: DevicePlatform.WEB,
    });

    const result = await service.subscribeWebPush('user-1', subA);
    expect(result.id).toBe('d1');
    expect(prisma.userDevice.create).not.toHaveBeenCalled();
    expect(prisma.userDevice.update).toHaveBeenCalledOnce();
  });

  it('unsubscribes only the matching WEB endpoint for the user', async () => {
    prisma.userDevice.findMany.mockResolvedValue([
      { id: 'd1', pushToken: serializeWebPushSubscription(subA) },
      { id: 'd2', pushToken: serializeWebPushSubscription(subB) },
    ]);

    await service.unsubscribeWebPush('user-1', subA.endpoint);
    expect(prisma.userDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['d1'] },
          userId: 'user-1',
          platform: DevicePlatform.WEB,
        }),
      }),
    );
  });

  it('sends WEB push successfully and ignores malformed tokens', async () => {
    prisma.userDevice.findMany.mockResolvedValue([
      {
        userId: 'user-1',
        platform: DevicePlatform.WEB,
        pushToken: serializeWebPushSubscription(subA),
      },
      {
        userId: 'user-1',
        platform: DevicePlatform.WEB,
        pushToken: 'not-json',
      },
      {
        userId: 'user-1',
        platform: DevicePlatform.IOS,
        pushToken: 'native-token',
      },
    ]);

    const result = await service.notifyUser('user-1', {
      title: 'عنوان',
      body: 'نص',
    });

    expect(sendNotificationMock).toHaveBeenCalledOnce();
    expect(result.accepted).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('cleans up on 410 Gone without touching other platforms', async () => {
    sendNotificationMock.mockRejectedValue({ statusCode: 410 });
    prisma.userDevice.findMany
      .mockResolvedValueOnce([
        {
          userId: 'user-1',
          platform: DevicePlatform.WEB,
          pushToken: serializeWebPushSubscription(subA),
        },
      ])
      .mockResolvedValueOnce([
        { id: 'd1', pushToken: serializeWebPushSubscription(subA) },
      ]);

    await service.notifyUser('user-1', { title: 't', body: 'b' });
    // allow async onGone
    await new Promise((r) => setTimeout(r, 0));

    expect(prisma.userDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          platform: DevicePlatform.WEB,
        }),
        data: { isActive: false, pushToken: null },
      }),
    );
  });

  it('cleans up on 404 as well', async () => {
    sendNotificationMock.mockRejectedValue({ statusCode: 404 });
    prisma.userDevice.findMany
      .mockResolvedValueOnce([
        {
          userId: 'user-1',
          platform: DevicePlatform.WEB,
          pushToken: serializeWebPushSubscription(subA),
        },
      ])
      .mockResolvedValueOnce([
        { id: 'd1', pushToken: serializeWebPushSubscription(subA) },
      ]);

    await service.notifyUser('user-1', { title: 't', body: 'b' });
    await new Promise((r) => setTimeout(r, 0));
    expect(prisma.userDevice.updateMany).toHaveBeenCalled();
  });

  it('boots with Web Push disabled when VAPID missing (no throw)', () => {
    const disabled = new PushNotificationService(
      prisma as never,
      makeConfig({}),
    );
    expect(() => disabled.onModuleInit()).not.toThrow();
    expect(disabled.isWebPushConfigured()).toBe(false);
    expect(disabled.getVapidPublicKey()).toBeNull();
  });
});

describe('NotificationsService push fan-out isolation', () => {
  it('still creates DB notification when push fails', async () => {
    const created = {
      id: 'n1',
      userId: 'u1',
      type: 'NEW_MESSAGE',
      title: 'رسالة جديدة',
      message: 'مرحباً هذا نص طويل جداً يجب ألا يُرسل كاملاً في القفل',
      targetUrl: '/messages/c1',
      isRead: false,
      createdAt: new Date(),
    };

    const prisma = {
      notification: {
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const realtime = { emitToUser: vi.fn() };
    const push = {
      notifyUser: vi.fn().mockRejectedValue(new Error('smtp-like boom')),
    };

    const notifications = new NotificationsService(
      prisma as never,
      realtime as never,
      push as never,
    );

    const result = await notifications.create(
      'u1',
      created.type as never,
      created.title,
      created.message,
      created.targetUrl,
    );

    expect(result.id).toBe('n1');
    expect(prisma.notification.create).toHaveBeenCalledOnce();
    expect(realtime.emitToUser).toHaveBeenCalledOnce();
    await new Promise((r) => setTimeout(r, 0));
    expect(push.notifyUser).toHaveBeenCalledOnce();
    const pushArg = push.notifyUser.mock.calls[0][1];
    expect(pushArg.body.length).toBeLessThanOrEqual(120);
    expect(pushArg.data.url).toBe('/messages/c1');
  });

  it('parses valid WEB subscription JSON for storage', () => {
    const raw = serializeWebPushSubscription({
      endpoint: 'https://fcm.googleapis.com/fcm/send/x',
      keys: { p256dh: 'a', auth: 'b' },
    });
    expect(parseWebPushSubscription(raw)?.endpoint).toContain('https://');
  });
});
