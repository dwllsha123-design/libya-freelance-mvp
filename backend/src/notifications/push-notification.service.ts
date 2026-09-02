import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  NoopPushNotificationProvider,
  type PushMessage,
  type PushNotificationProvider,
  type PushDeliveryResult,
} from './push-notification.provider.js';

/**
 * Orchestrates optional push fan-out after a DB notification exists.
 * Never throws into business flows — failures are logged only.
 */
@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private provider: PushNotificationProvider = new NoopPushNotificationProvider();

  constructor(private readonly prisma: PrismaService) {}

  /** Swap provider at boot when FCM/APNs secrets are present (future). */
  setProvider(provider: PushNotificationProvider) {
    this.provider = provider;
  }

  getProviderName() {
    return this.provider.name;
  }

  /**
   * Deliver to active devices that have a push token.
   * Safe to call after NotificationsService.create — does not mutate DB notifications.
   */
  async notifyUser(userId: string, message: PushMessage): Promise<PushDeliveryResult> {
    try {
      const devices = await this.prisma.userDevice.findMany({
        where: {
          userId,
          isActive: true,
          pushToken: { not: null },
          platform: { in: ['IOS', 'ANDROID'] },
        },
        select: { userId: true, platform: true, pushToken: true },
      });

      const targets = devices
        .filter((d) => d.pushToken)
        .map((d) => ({
          userId: d.userId,
          platform: d.platform as 'IOS' | 'ANDROID',
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
        errors: [err instanceof Error ? err.message : 'unknown'],
      };
    }
  }
}
