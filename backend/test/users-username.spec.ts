import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../src/users/users.service.js';

describe('UsersService.generateUniqueUsername', () => {
  const findUnique = vi.fn();
  let service: UsersService;

  beforeEach(() => {
    findUnique.mockReset();
    service = new UsersService({
      profile: { findUnique },
    } as never);
  });

  it('returns base username when available', async () => {
    findUnique.mockResolvedValue(null);
    await expect(service.generateUniqueUsername('Hussin', 'Altoomy')).resolves.toBe(
      'hussin-altoomy',
    );
  });

  it('uses sequential suffixes on collision', async () => {
    findUnique
      .mockResolvedValueOnce({ id: '1' })
      .mockResolvedValueOnce({ id: '2' })
      .mockResolvedValueOnce(null);

    await expect(service.generateUniqueUsername('Hussin', 'Altoomy')).resolves.toBe(
      'hussin-altoomy-3',
    );
  });

  it('does not assign reserved usernames from display names', async () => {
    findUnique.mockResolvedValue(null);
    const username = await service.generateUniqueUsername('Support', '');
    expect(username).not.toBe('support');
    expect(username).toBe('user-support');
  });

  it('two parallel-ish calls get different candidates when first is taken', async () => {
    findUnique
      .mockResolvedValueOnce({ id: 'taken' })
      .mockResolvedValueOnce(null);

    await expect(service.generateUniqueUsername('Mohamed', 'Ali')).resolves.toBe(
      'mohamed-ali-2',
    );
  });
});
