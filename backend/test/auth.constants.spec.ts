import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { PUBLIC_ROLES } from '../src/auth/constants.js';

describe('auth constants', () => {
  it('allows only freelancer and client for public registration', () => {
    expect(PUBLIC_ROLES).toContain(Role.FREELANCER);
    expect(PUBLIC_ROLES).toContain(Role.CLIENT);
    expect(PUBLIC_ROLES).not.toContain(Role.ADMIN);
  });
});
