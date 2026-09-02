/**
 * Push delivery abstraction for future FCM / APNs.
 * Database Notification rows remain the source of truth.
 * Push failures must never delete or roll back inbox notifications.
 */

export type PushPlatform = 'IOS' | 'ANDROID' | 'WEB';

export interface PushTarget {
  userId: string;
  platform: PushPlatform;
  pushToken: string;
}

export interface PushMessage {
  title: string;
  body: string;
  /** Internal deep-link path, e.g. /projects/slug — never a secret */
  data?: Record<string, string>;
  /** Optional link to the DB notification id for client-side dedupe */
  notificationId?: string;
}

export interface PushDeliveryResult {
  accepted: number;
  failed: number;
  provider: string;
  errors?: string[];
}

export abstract class PushNotificationProvider {
  abstract readonly name: string;

  abstract send(
    targets: PushTarget[],
    message: PushMessage,
  ): Promise<PushDeliveryResult>;
}

/** No-op provider until FCM/APNs credentials are configured in a secure secrets store */
export class NoopPushNotificationProvider extends PushNotificationProvider {
  readonly name = 'noop';

  async send(
    _targets: PushTarget[],
    _message: PushMessage,
  ): Promise<PushDeliveryResult> {
    return { accepted: 0, failed: 0, provider: this.name };
  }
}
