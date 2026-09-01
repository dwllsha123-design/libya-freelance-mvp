import type { Role, UserStatus } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  type: 'access';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  profile: {
    firstName: string;
    lastName: string;
    username: string;
  } | null;
}
