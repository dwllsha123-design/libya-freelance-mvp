import { describe, expect, it } from 'vitest';
import {
  buildPortfolioObjectKey,
  buildProfileObjectKey,
  objectKeyFromPublicUrl,
} from '../src/storage/storage-upload.util.js';

describe('storage-upload.util', () => {
  it('builds safe profile object keys, always .webp', () => {
    const key = buildProfileObjectKey('user-1');
    expect(key).toMatch(/^profile-images\/user-1\/[0-9a-f-]+\.webp$/);
    expect(key).not.toContain('..');
  });

  it('builds safe portfolio object keys, always .webp', () => {
    const key = buildPortfolioObjectKey('user-1', 'item-1');
    expect(key).toMatch(/^portfolio\/user-1\/item-1\/[0-9a-f-]+\.webp$/);
  });

  it('rejects unsafe path segments', () => {
    expect(() => buildProfileObjectKey('../evil')).toThrow();
    expect(() =>
      buildPortfolioObjectKey('user', '../../etc/passwd'),
    ).toThrow();
  });

  it('extracts object key from public URL', () => {
    const base = 'https://cdn.example.com/assets';
    const key = objectKeyFromPublicUrl(
      `${base}/profile-images/u1/abc.png`,
      base,
    );
    expect(key).toBe('profile-images/u1/abc.png');
  });

  it('rejects traversal in public URL keys', () => {
    const base = 'https://cdn.example.com/assets';
    expect(
      objectKeyFromPublicUrl(`${base}/profile-images/../secret`, base),
    ).toBeNull();
  });
});
