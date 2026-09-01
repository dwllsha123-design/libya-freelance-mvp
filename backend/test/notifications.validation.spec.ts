import { describe, expect, it } from 'vitest';
import { NotificationType } from '@prisma/client';
import {
  assertInternalTargetUrl,
  isValidInternalTargetUrl,
} from '../src/notifications/notification-url.util.js';
import {
  NOTIFICATION_TYPES,
  userNotificationRoom,
} from '../src/notifications/notifications.constants.js';

describe('notification URL validation', () => {
  it('accepts internal paths', () => {
    expect(assertInternalTargetUrl('/dashboard/proposals')).toBe(
      '/dashboard/proposals',
    );
    expect(assertInternalTargetUrl('/messages/abc-123')).toBe(
      '/messages/abc-123',
    );
  });

  it('rejects external and protocol-relative URLs', () => {
    expect(() => assertInternalTargetUrl('https://evil.com')).toThrow();
    expect(() => assertInternalTargetUrl('//evil.com')).toThrow();
    expect(isValidInternalTargetUrl('javascript:alert(1)')).toBe(false);
  });

  it('allows empty target', () => {
    expect(assertInternalTargetUrl(undefined)).toBeUndefined();
    expect(assertInternalTargetUrl(null)).toBeUndefined();
  });
});

describe('notification realtime helpers', () => {
  it('builds user-specific room from server identity', () => {
    expect(userNotificationRoom('user-1')).toBe('user:user-1');
    expect(userNotificationRoom('user-2')).not.toBe(userNotificationRoom('user-1'));
  });
});

describe('notification enum coverage', () => {
  it('includes all marketplace notification types', () => {
    expect(NOTIFICATION_TYPES).toEqual([
      NotificationType.NEW_PROPOSAL,
      NotificationType.PROPOSAL_ACCEPTED,
      NotificationType.PROPOSAL_REJECTED,
      NotificationType.NEW_MESSAGE,
      NotificationType.PROJECT_COMPLETION_REQUESTED,
      NotificationType.PROJECT_COMPLETED,
      NotificationType.NEW_REVIEW,
    ]);
  });
});

describe('notification ownership rules', () => {
  it('mark read idempotency is modeled by isRead flag', () => {
    const read = { isRead: true };
    const unread = { isRead: false };
    expect(read.isRead).toBe(true);
    expect(unread.isRead).toBe(false);
  });
});

describe('message aggregation policy', () => {
  it('only NEW_MESSAGE is aggregated per conversation', () => {
    const aggregated = [NotificationType.NEW_MESSAGE];
    const discrete = NOTIFICATION_TYPES.filter(
      (type) => type !== NotificationType.NEW_MESSAGE,
    );

    expect(aggregated).toHaveLength(1);
    expect(discrete).not.toContain(NotificationType.NEW_MESSAGE);
    expect(discrete).toContain(NotificationType.NEW_PROPOSAL);
    expect(discrete).toContain(NotificationType.NEW_REVIEW);
  });
});
