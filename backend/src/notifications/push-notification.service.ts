import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DevicePlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NoopPushNotificationProvider,
  type PushMessage,
  type PushNotificationProvider,
  type PushDeliveryResult,
} from './push-notification.provider.js';
import { WebPushNotificationProvider } from './web-push.provider.js';
import {
  parseWebPushSubscription,
  resolvePushVapidConfig,
  serializeWebPushSubscription,
  type WebPushSubscriptionPayload,
} from './web-push-subscription.util.js';

/**
 * Orchestrates optional push fan-out after a DB notification exists.
 * Never throws into business flows — failures are logged only.
 */
@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private provider: PushNotificationProvider = new NoopPushNotificationProvider();
  private vapidPublicKey: string | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const resolved = resolvePushVapidConfig({
      publicKey: this.configService.get<string>('push.vapidPublicKey'),
      privateKey: this.configService.get<string>('push.vapidPrivateKey'),
      subject: this.configService.get<string>('push.vapidSubject'),
    });

    if (!resolved.enabled) {
      this.provider = new NoopPushNotificationProvider();
      this.vapidPublicKey = null;
      this.logger.warn(
        `Web Push disabled: ${resolved.reason}. Inbox + realtime still work.`,
      );
      return;
    }

    this.vapidPublicKey = resolved.publicKey;
    this.provider = new WebPushNotificationProvider(
      {
        publicKey: resolved.publicKey,
        privateKey: resolved.privateKey,
        subject: resolved.subject,
      },
      {
        onGone: async (endpoint) => {
          await this.deactivateByEndpoint(endpoint);
        },
      },
    );
    this.logger.log(
      'Web Push provider ready (subject configured, public key present)',
    );
  }

  getProviderName() {
    return this.provider.name;
  }

  isWebPushConfigured() {
    return Boolean(this.vapidPublicKey);
  }

  /** Public key only — safe to expose to the browser */
  getVapidPublicKey(): string | null {
    return this.vapidPublicKey;
  }

  /**
   * Idempotent per (userId, endpoint). Different browsers/devices keep separate rows.
   * Re-subscribing the same endpoint refreshes the stored JSON; does not create duplicates.
   */
  async subscribeWebPush(
    userId: string,
    subscription: WebPushSubscriptionPayload,
  ): Promise<{ id: string; platform: DevicePlatform }> {
    if (!subscription.endpoint.startsWith('https://')) {
      throw new BadRequestException('Invalid push subscription endpoint');
    }

    let token: string;
    try {
      token = serializeWebPushSubscription(subscription);
    } catch {
      throw new BadRequestException('Push subscription payload too large');
    }

    const existing = await this.prisma.userDevice.findMany({
      where: {
        userId,
        platform: DevicePlatform.WEB,
      },
      select: { id: true, pushToken: true },
    });

    const match = existing.find((device) => {
      const parsed = parseWebPushSubscription(device.pushToken);
      return parsed?.endpoint === subscription.endpoint;
    });

    if (match) {
      const updated = await this.prisma.userDevice.update({
        where: { id: match.id },
        data: {
          pushToken: token,
          lastActiveAt: new Date(),
          isActive: true,
        },
      });
      return { id: updated.id, platform: updated.platform };
    }

    const created = await this.prisma.userDevice.create({
      data: {
        userId,
        platform: DevicePlatform.WEB,
        pushToken: token,
        lastActiveAt: new Date(),
        isActive: true,
      },
    });
    return { id: created.id, platform: created.platform };
  }

  async unsubscribeWebPush(
    userId: string,
    endpoint: string,
  ): Promise<{ affected: number }> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId, platform: DevicePlatform.WEB },
      select: { id: true, pushToken: true },
    });
    const ids = devices
      .filter((d) => parseWebPushSubscription(d.pushToken)?.endpoint === endpoint)
      .map((d) => d.id);
    if (!ids.length) {
      return { affected: 0 };
    }
    const result = await this.prisma.userDevice.updateMany({
      where: { id: { in: ids }, userId, platform: DevicePlatform.WEB },
      data: { isActive: false, pushToken: null },
    });
    return { affected: result.count };
  }

  /**
   * Deliver to active devices that have a push token (WEB + future native).
   * Safe to call after NotificationsService.create — does not mutate DB notifications.
   */
  async notifyUser(userId: string, message: PushMessage): Promise<PushDeliveryResult> {
    try {
      const devices = await this.prisma.userDevice.findMany({
        where: {
          userId,
          isActive: true,
          pushToken: { not: null },
          platform: {
            in: [DevicePlatform.WEB, DevicePlatform.IOS, DevicePlatform.ANDROID],
          },
        },
        select: { userId: true, platform: true, pushToken: true },
      });

      const targets = devices
        .filter((d) => d.pushToken)
        .map((d) => ({
          userId: d.userId,
          platform: d.platform as 'WEB' | 'IOS' | 'ANDROID',
          pushToken: d.pushToken!,
        }));

      if (!targets.length) {
        return { accepted: 0, failed: 0, provider: this.provider.name };
      }

      return await this.provider.send(targets, message);
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
        errors: ['delivery_error'],
      };
    }
  }

  /** Deactivate WEB rows matching a gone endpoint — never touches IOS/ANDROID */
  private async deactivateByEndpoint(endpoint: string): Promise<void> {
    const devices = await this.prisma.userDevice.findMany({
      where: {
        platform: DevicePlatform.WEB,
        isActive: true,
        pushToken: { not: null },
      },
      select: { id: true, pushToken: true },
    });
    const ids = devices
      .filter((d) => parseWebPushSubscription(d.pushToken)?.endpoint === endpoint)
      .map((d) => d.id);
    if (!ids.length) return;
    await this.prisma.userDevice.updateMany({
      where: { id: { in: ids }, platform: DevicePlatform.WEB },
      data: { isActive: false, pushToken: null },
    });
    this.logger.log(
      `Deactivated ${ids.length} expired WEB push subscription(s)`,
    );
  }
}
