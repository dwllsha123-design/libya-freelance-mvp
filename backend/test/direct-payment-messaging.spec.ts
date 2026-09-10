import { describe, expect, it } from 'vitest';
import { validateMessageContent } from '../src/messaging/message-validation.util.js';

describe('direct-payment launch — contact exchange in private messages', () => {
  it('allows phone numbers in message content', () => {
    expect(() =>
      validateMessageContent('تواصل معي على 0912345678'),
    ).not.toThrow();
  });

  it('allows WhatsApp / contact details', () => {
    expect(() =>
      validateMessageContent('WhatsApp: +218912345678 أو email@example.com'),
    ).not.toThrow();
  });
});
