import { describe, expect, it } from 'vitest';
import {
  categoryForType,
  DEFAULT_NOTIFICATION_PRIORITY,
  EMAIL_ELIGIBLE_TYPES,
} from '../src/notifications/notification-types.js';
import {
  normalizeLocale,
  resolveNotificationCopy,
} from '../src/notifications/notification-i18n.js';
import { NotificationType, NotificationPriority } from '@prisma/client';
import { isValidInternalTargetUrl } from '../src/notifications/notification-url.util.js';

describe('Notification types & i18n', () => {
  it('maps types to categories', () => {
    expect(categoryForType(NotificationType.NEW_MESSAGE)).toBe('MESSAGES');
    expect(categoryForType(NotificationType.PAYMENT_SUCCESS)).toBe('PAYMENTS');
    expect(categoryForType(NotificationType.POINTS_EARNED)).toBe('POINTS');
    expect(categoryForType(NotificationType.PROJECT_MATCHED)).toBe('PROJECTS');
  });

  it('assigns security alerts critical priority', () => {
    expect(
      DEFAULT_NOTIFICATION_PRIORITY[NotificationType.ACCOUNT_SECURITY_ALERT],
    ).toBe(NotificationPriority.CRITICAL);
  });

  it('only emails important events by default', () => {
    expect(EMAIL_ELIGIBLE_TYPES.has(NotificationType.PROPOSAL_ACCEPTED)).toBe(
      true,
    );
    expect(EMAIL_ELIGIBLE_TYPES.has(NotificationType.NEW_MESSAGE)).toBe(false);
    expect(EMAIL_ELIGIBLE_TYPES.has(NotificationType.PROJECT_MATCHED)).toBe(
      false,
    );
  });

  it('resolves Arabic and English templates', () => {
    const ar = resolveNotificationCopy(NotificationType.PROPOSAL_ACCEPTED, 'ar', {
      projectTitle: 'تصميم شعار',
    });
    const en = resolveNotificationCopy(NotificationType.PROPOSAL_ACCEPTED, 'en', {
      projectTitle: 'Logo design',
    });
    expect(ar.title).toContain('قبول');
    expect(ar.message).toContain('تصميم شعار');
    expect(en.title.toLowerCase()).toContain('accepted');
    expect(en.message).toContain('Logo design');
  });

  it('normalizes locales', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('ar')).toBe('ar');
    expect(normalizeLocale(null)).toBe('ar');
  });

  it('validates internal deep links only', () => {
    expect(isValidInternalTargetUrl('/projects/abc')).toBe(true);
    expect(isValidInternalTargetUrl('https://evil.example')).toBe(false);
    expect(isValidInternalTargetUrl('//evil.example')).toBe(false);
  });
});
