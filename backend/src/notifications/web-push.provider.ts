import { Logger } from '@nestjs/common';
import webpush from 'web-push';
import { parseWebPushSubscription } from './web-push-subscription.util.js';
import {
  PushNotificationProvider,
  type PushDeliveryResult,
  type PushMessage,
  type PushTarget,
} from './push-notification.provider.js';

export type WebPushVapidDetails = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

/**
 * Web Push (VAPID) provider. Native IOS/ANDROID tokens are ignored here
 * until an FCM/APNs provider is wired.
 */
export class WebPushNotificationProvider extends PushNotificationProvider {
  readonly name = 'web-push';
  private readonly logger = new Logger(WebPushNotificationProvider.name);
  private readonly onGone?: (endpoint: string) => Promise<void>;

  constructor(
    vapid: WebPushVapidDetails,
    options?: { onGone?: (endpoint: string) => Promise<void> },
  ) {
    super();
    webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
    this.onGone = options?.onGone;
  }

  async send(
    targets: PushTarget[],
    message: PushMessage,
  ): Promise<PushDeliveryResult> {
    const payload = JSON.stringify({
      title: message.title,
      body: message.body,
      data: {
        ...message.data,
        ...(message.notificationId
          ? { notificationId: message.notificationId }
          : {}),
      },
    });

    let accepted = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const target of targets) {
      if (target.platform !== 'WEB') {
        continue;
      }
      const subscription = parseWebPushSubscription(target.pushToken);
      if (!subscription) {
        failed += 1;
        errors.push('invalid_web_subscription');
        continue;
      }

      try {
        await webpush.sendNotification(subscription, payload, {
          TTL: 60 * 60,
        });
        accepted += 1;
      } catch (err) {
        failed += 1;
        const statusCode =
          err && typeof err === 'object' && 'statusCode' in err
            ? Number((err as { statusCode?: number }).statusCode)
            : undefined;
        if (statusCode === 404 || statusCode === 410) {
          void this.onGone?.(subscription.endpoint).catch(() => undefined);
          errors.push('subscription_gone');
        } else {
          this.logger.warn('Web Push delivery failed for one subscription');
          errors.push('delivery_failed');
        }
      }
    }

    return {
      accepted,
      failed,
      provider: this.name,
      errors: errors.length ? errors : undefined,
    };
  }
}
