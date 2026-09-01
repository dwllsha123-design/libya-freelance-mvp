import { describe, expect, it } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import {
  normalizeUsername,
  validateUsername,
} from '../src/common/utils/username.util.js';

describe('username.util', () => {
  it('normalizes usernames', () => {
    expect(normalizeUsername('Ahmed Ali')).toBe('ahmed-ali');
  });

  it('rejects reserved usernames', () => {
    expect(() => validateUsername('admin')).toThrow(BadRequestException);
    expect(() => validateUsername('dashboard')).toThrow(BadRequestException);
  });

  it('accepts valid usernames', () => {
    expect(() => validateUsername('ahmed-dev')).not.toThrow();
  });

  it('rejects too short usernames', () => {
    expect(() => validateUsername('ab')).toThrow(BadRequestException);
  });
});
