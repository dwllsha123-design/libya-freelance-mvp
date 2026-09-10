import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  isValidPublicUsername,
  normalizeUsername,
  usernameBaseFromName,
  usernameCandidate,
  validateUsername,
} from '../src/common/utils/username.util.js';

describe('username.util', () => {
  it('normalizes usernames', () => {
    expect(normalizeUsername('Ahmed Ali')).toBe('ahmed-ali');
    expect(normalizeUsername('Hussin Altoomy')).toBe('hussin-altoomy');
  });

  it('rejects reserved usernames', () => {
    expect(() => validateUsername('admin')).toThrow(BadRequestException);
    expect(() => validateUsername('dashboard')).toThrow(BadRequestException);
    expect(() => validateUsername('u')).toThrow(BadRequestException);
    expect(() => validateUsername('business')).toThrow(BadRequestException);
    expect(() => validateUsername('API')).toThrow(BadRequestException);
  });

  it('accepts valid usernames', () => {
    expect(() => validateUsername('ahmed-dev')).not.toThrow();
    expect(() => validateUsername('hussin-altoomy')).not.toThrow();
  });

  it('rejects too short usernames', () => {
    expect(() => validateUsername('ab')).toThrow(BadRequestException);
  });

  it('rejects invalid characters', () => {
    expect(() => validateUsername('ahmed ali!')).toThrow(BadRequestException);
    expect(() => validateUsername('../etc/passwd')).toThrow(BadRequestException);
    expect(isValidPublicUsername('../etc/passwd')).toBe(false);
    expect(isValidPublicUsername('a/b')).toBe(false);
  });

  it('builds name base and collision candidates', () => {
    expect(usernameBaseFromName('Hussin', 'Altoomy')).toBe('hussin-altoomy');
    expect(usernameCandidate('hussin-altoomy', 0)).toBe('hussin-altoomy');
    expect(usernameCandidate('hussin-altoomy', 1)).toBe('hussin-altoomy-2');
    expect(usernameCandidate('hussin-altoomy', 2)).toBe('hussin-altoomy-3');
  });

  it('avoids reserved bases from display names', () => {
    expect(usernameBaseFromName('Support', '')).toBe('user-support');
    expect(isValidPublicUsername(usernameBaseFromName('Support', ''))).toBe(true);
  });
});
