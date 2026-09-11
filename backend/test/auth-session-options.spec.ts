import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AuthService } from '../src/auth/auth.service.js';

describe('AuthService.resolveSessionOptions', () => {
  const service = Object.create(AuthService.prototype) as AuthService;

  it('defaults to web channel', () => {
    expect(service.resolveSessionOptions({})).toEqual({ channel: 'web' });
  });

  it('accepts native IOS / ANDROID', () => {
    expect(
      service.resolveSessionOptions({
        clientChannel: 'native',
        platform: 'IOS',
        appVersion: '2.1.0',
      }),
    ).toEqual({
      channel: 'native',
      platform: 'IOS',
      appVersion: '2.1.0',
    });
  });

  it('rejects native without platform', () => {
    expect(() =>
      service.resolveSessionOptions({ clientChannel: 'native' }),
    ).toThrow(BadRequestException);
  });
});
