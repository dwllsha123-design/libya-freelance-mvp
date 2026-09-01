import { describe, expect, it } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import {
  assertAdminCanModerateUser,
  assertValidStatusTransition,
  slugifyAdmin,
} from '../src/admin/admin-policy.util.js';

describe('admin user policy', () => {
  it('blocks self moderation', () => {
    expect(() =>
      assertAdminCanModerateUser('admin-1', { id: 'admin-1', role: Role.ADMIN }),
    ).toThrow(ForbiddenException);
  });

  it('blocks moderating another admin', () => {
    expect(() =>
      assertAdminCanModerateUser('admin-1', { id: 'admin-2', role: Role.ADMIN }),
    ).toThrow(ForbiddenException);
  });

  it('allows moderating client/freelancer', () => {
    expect(() =>
      assertAdminCanModerateUser('admin-1', { id: 'u-1', role: Role.CLIENT }),
    ).not.toThrow();
  });
});

describe('admin status transitions', () => {
  it('allows suspend from active', () => {
    expect(() =>
      assertValidStatusTransition(UserStatus.ACTIVE, UserStatus.SUSPENDED),
    ).not.toThrow();
  });

  it('rejects banned to suspended', () => {
    expect(() =>
      assertValidStatusTransition(UserStatus.BANNED, UserStatus.SUSPENDED),
    ).toThrow();
  });
});

describe('admin slug validation', () => {
  it('accepts valid slug', () => {
    expect(slugifyAdmin('web-development')).toBe('web-development');
  });

  it('rejects empty slug', () => {
    expect(() => slugifyAdmin('  ')).toThrow();
  });
});
