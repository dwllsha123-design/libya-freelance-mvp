import { describe, expect, it } from 'vitest';
import {
  parseWebPushSubscription,
  resolvePushVapidConfig,
  serializeWebPushSubscription,
} from '../src/notifications/web-push-subscription.util.js';

describe('web push subscription util', () => {
  it('round-trips subscription JSON for UserDevice.pushToken', () => {
    const sub = {
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      keys: { p256dh: 'p256', auth: 'auth' },
    };
    const raw = serializeWebPushSubscription(sub);
    expect(parseWebPushSubscription(raw)).toEqual(sub);
  });

  it('rejects invalid subscription payloads', () => {
    expect(parseWebPushSubscription('not-json')).toBeNull();
    expect(
      parseWebPushSubscription(
        JSON.stringify({
          endpoint: 'http://insecure',
          keys: { p256dh: 'a', auth: 'b' },
        }),
      ),
    ).toBeNull();
  });

  it('resolves VAPID config and defaults subject to support@', () => {
    const enabled = resolvePushVapidConfig({
      publicKey: 'pub',
      privateKey: 'priv',
    });
    expect(enabled.enabled).toBe(true);
    if (enabled.enabled) {
      expect(enabled.subject).toBe('mailto:support@libyanfreelance.ly');
    }
  });

  it('disables when VAPID unset', () => {
    expect(resolvePushVapidConfig({}).enabled).toBe(false);
  });

  it('disables (no throw) on incomplete VAPID', () => {
    expect(resolvePushVapidConfig({ publicKey: 'only-public' }).enabled).toBe(
      false,
    );
  });
});
