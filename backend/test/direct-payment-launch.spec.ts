import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  encodeChatAttachment,
  parseChatAttachment,
} from '../src/messaging/message-attachment.util.js';
import { DEFAULT_PAYMENT_TERMS } from '../src/agreements/agreements.constants.js';
import { isMarketplacePaymentProtectionActive } from '../src/payments/payment-protection.policy.js';

describe('direct-payment launch model — agreement copy & flags', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('default payment terms describe direct payment, not escrow deposit', () => {
    expect(DEFAULT_PAYMENT_TERMS).toMatch(/مباشرة/);
    expect(DEFAULT_PAYMENT_TERMS).not.toMatch(/يُحرَّر صافي المستقل بعد إكمال/);
  });

  it('payment protection is permanently off', () => {
    vi.stubEnv('PAYMENT_PROTECTION_ACTIVE', 'true');
    expect(isMarketplacePaymentProtectionActive()).toBe(false);
  });
});

describe('chat attachment URL rewrite helpers', () => {
  it('legacy uploads/chat URLs can be rewritten to media proxy paths', () => {
    const encoded = encodeChatAttachment({
      v: 1,
      name: 'brief.pdf',
      url: 'http://localhost:4000/uploads/chat/user-1/file.pdf',
      mime: 'application/pdf',
      size: 12,
    });
    const parsed = parseChatAttachment(encoded);
    expect(parsed).not.toBeNull();
    const rewritten = parsed!.url.replace('/uploads/chat/', '/api/media/chat/');
    expect(rewritten).toContain('/api/media/chat/user-1/file.pdf');
  });
});
