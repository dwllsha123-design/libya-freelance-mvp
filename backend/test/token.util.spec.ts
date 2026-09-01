import { describe, expect, it } from 'vitest';
import { hashToken, slugifyUsername, parseDurationToMs } from '../src/common/utils/token.util.js';

describe('token.util', () => {
  it('hashes tokens consistently', () => {
    const token = 'sample-token';
    expect(hashToken(token)).toBe(hashToken(token));
    expect(hashToken(token)).not.toBe(token);
  });

  it('slugifies usernames', () => {
    expect(slugifyUsername('Ahmed Ali')).toBe('ahmed-ali');
  });

  it('parses duration strings', () => {
    expect(parseDurationToMs('15m')).toBe(15 * 60 * 1000);
    expect(parseDurationToMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
