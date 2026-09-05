import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NoopPushNotificationProvider,
  PushNotificationProvider,
  type PushDeliveryResult,
  type PushMessage,
  type PushTarget,
} from './push-notification.provider.js';

class WebPushProvider extends PushNotificationProvider {
  readonly name = 'web-push';

  constructor(
    private readonly publicKey: string,
    private readonly privateKey: string,
    private readonly subject: string,
  ) {
    super();
    webpush.setVapidDetails(this.subject, this.publicKey, this.privateKey);
  }

  async send(
    targets: PushTarget[],
    message: PushMessage,
  ): Promise<PushDeliveryResult> {
    let accepted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const target of targets) {
      if (target.platform !== 'WEB') continue;
      try {
        const payload = JSON.parse(target.pushToken) as {
          endpoint: string;
          keys: { p256dh: string; auth: string };
        };
        await webpush.sendNotification(
          {
            endpoint: payload.endpoint,
            keys: payload.keys,
          },
          JSON.stringify({
            title: message.title,
            body: message.body,
            data: {
              ...message.data,
              notificationId: message.notificationId ?? '',
            },
          }),
        );
        accepted += 1;
      } catch (err) {
        failed += 1;
        errors.push(err instanceof Error ? err.message : 'web-push failed');
      }
    }

    return { accepted, failed, provider: this.name, errors };
  }
}

/**
 * Orchestrates push fan-out (Web Push VAPID + future mobile tokens).
 * Never throws into business flows — failures are logged only.
 */
@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private provider: PushNotificationProvider =
    new NoopPushNotificationProvider();
  private vapidPublicKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit() {
    const publicKey =
      this.configService.get<string>('push.vapidPublicKey')?.trim() ?? '';
    const privateKey =
      this.configService.get<string>('push.vapidPrivateKey')?.trim() ?? '';
    const subject =
      this.configService.get<string>('push.vapidSubject')?.trim() ??
      'mailto:support@libyanfreelance.ly';

    if (publicKey && privateKey) {
      this.provider = new WebPushProvider(publicKey, privateKey, subject);
      this.vapidPublicKey = publicKey;
      this.logger.log('Web Push (VAPID) provider enabled');
    } else {
      this.logger.warn(
        'Web Push disabled — set PUSH_VAPID_PUBLIC_KEY and PUSH_VAPID_PRIVATE_KEY',
      );
    }
  }

  setProvider(provider: PushNotificationProvider) {
    this.provider = provider;
  }

  getProviderName() {
    return this.provider.name;
  }

  getPublicKey() {
    return this.vapidPublicKey;
  }

  async notifyUser(
    userId: string,
    message: PushMessage,
  ): Promise<PushDeliveryResult> {
    try {
      const [devices, subscriptions] = await Promise.all([
        this.prisma.userDevice.findMany({
          where: {
            userId,
            isActive: true,
            pushToken: { not: null },
            platform: { in: ['IOS', 'ANDROID'] },
          },
          select: { userId: true, platform: true, pushToken: true },
        }),
        this.prisma.pushSubscription.findMany({
          where: { userId, isActive: true },
        }),
      ]);

      const targets: PushTarget[] = [
        ...devices
          .filter((d) => d.pushToken)
          .map((d) => ({
            userId: d.userId,
            platform: d.platform as 'IOS' | 'ANDROID',
            pushToken: d.pushToken!,
          })),
        ...subscriptions.map((s) => ({
          userId,
          platform: 'WEB' as const,
          pushToken: JSON.stringify({
            endpoint: s.endpoint,
            keys: { p256dh: s.p256dh, auth: s.auth },
          }),
        })),
      ];

      if (!targets.length) {
        return { accepted: 0, failed: 0, provider: this.provider.name };
      }

      const result = await this.provider.send(targets, message);

      if (subscriptions.length) {
        await this.prisma.pushSubscription.updateMany({
          where: {
            userId,
            isActive: true,
            endpoint: { in: subscriptions.map((s) => s.endpoint) },
          },
          data: { lastUsedAt: new Date() },
        });
      }

      return result;
    } catch (err) {
      this.logger.warn(
        `Push delivery skipped for user ${userId}: ${
          err instanceof Error ? err.message : 'unknown error'
        }`,
      );
      return {
        accepted: 0,
        failed: 1,
        provider: this.provider.name,
        errors: [err instanceof Error ? err.message : 'unknown'],
      };
    }
  }

  async upsertSubscription(
    userId: string,
    input: {
      endpoint: string;
      p256dh: string;
      auth: string;
      deviceType?: string;
      browser?: string;
      userAgent?: string;
    },
  ) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: input.endpoint },
      create: {
        userId,
        endpoint: input.endpoint,
        p256dh: input.p256dh,
        auth: input.auth,
        deviceType: input.deviceType,
        browser: input.browser,
        userAgent: input.userAgent,
        isActive: true,
        lastUsedAt: new Date(),
      },
      update: {
        userId,
        p256dh: input.p256dh,
        auth: input.auth,
        deviceType: input.deviceType,
        browser: input.browser,
        userAgent: input.userAgent,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async removeSubscription(userId: string, subscriptionId: string) {
    const existing = await this.prisma.pushSubscription.findFirst({
      where: { id: subscriptionId, userId },
    });
    if (!existing) return { deleted: false };
    await this.prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { isActive: false },
    });
    return { deleted: true };
  }
}
