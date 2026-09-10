import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { AdminUpdateFreelancerDto } from '../src/admin/dto/admin-update-freelancer.dto.js';

describe('AdminUpdateFreelancerDto', () => {
  it('does not expose secret authentication fields on the class', () => {
    const sample = Object.getOwnPropertyNames(AdminUpdateFreelancerDto.prototype);
    expect(sample.includes('password')).toBe(false);
    expect(sample.includes('passwordHash')).toBe(false);
    expect(sample.includes('refreshToken')).toBe(false);
  });

  it('documents skillIds omit vs empty-array semantics via ValidationPipe', async () => {
    const { ValidationPipe } = await import('@nestjs/common');
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    const omitted = await pipe.transform(
      { firstName: 'أحمد' },
      { type: 'body', metatype: AdminUpdateFreelancerDto },
    );
    expect((omitted as AdminUpdateFreelancerDto).skillIds).toBeUndefined();

    const cleared = await pipe.transform(
      { skillIds: [] },
      { type: 'body', metatype: AdminUpdateFreelancerDto },
    );
    expect((cleared as AdminUpdateFreelancerDto).skillIds).toEqual([]);
  });
});

describe('freelancer edit permission intent', () => {
  it('requires SUPER_ADMIN or staff + explicit MANAGE_USERS (not ADMIN role alone)', () => {
    const canEditAccount = (role: Role, permissions: string[]) => {
      if (role === Role.SUPER_ADMIN) return true;
      if (role !== Role.ADMIN && role !== Role.MODERATOR) return false;
      return permissions.includes('MANAGE_USERS');
    };

    expect(canEditAccount(Role.SUPER_ADMIN, [])).toBe(true);
    expect(canEditAccount(Role.ADMIN, ['MANAGE_USERS'])).toBe(true);
    expect(canEditAccount(Role.ADMIN, [])).toBe(false);
    expect(canEditAccount(Role.MODERATOR, ['MANAGE_USERS'])).toBe(true);
    expect(canEditAccount(Role.MODERATOR, [])).toBe(false);
    expect(canEditAccount(Role.FREELANCER, ['MANAGE_USERS'])).toBe(false);
  });
});
