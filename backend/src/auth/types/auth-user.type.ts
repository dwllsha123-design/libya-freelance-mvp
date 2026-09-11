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

/** How refresh tokens are delivered to the client (not an authorization claim). */
export type AuthClientChannel = 'web' | 'native';

export type NativeDevicePlatform = 'IOS' | 'ANDROID';

export interface AuthSessionOptions {
  channel: AuthClientChannel;
  /** Required for native channel — links RefreshToken → UserDevice */
  platform?: NativeDevicePlatform;
  appVersion?: string;
  /** Reuse existing UserDevice on refresh rotation */
  existingDeviceId?: string;
}

export interface SafeUser {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  createdAt: Date;
  hasClientProfile: boolean;
  hasFreelancerProfile: boolean;
  clientDisplayName: string | null;
  profile: {
    firstName: string;
    lastName: string;
    username: string;
    profilePhoto: string | null;
  } | null;
}

export interface IssuedAuthSession {
  user: SafeUser;
  tokens: AuthTokens;
  channel: AuthClientChannel;
}

/**
 * Registration outcome after the critical User transaction commits.
 * accountCreated=true must never be represented as a generic registration failure.
 */
export type RegisterResult =
  | (IssuedAuthSession & {
      accountCreated: true;
      authenticated: true;
    })
  | {
      accountCreated: true;
      authenticated: false;
      requiresLogin: true;
      channel: AuthClientChannel;
    };

/** Claims embedded in refresh JWTs (never log raw tokens). */
export interface RefreshJwtPayload {
  sub: string;
  type: 'refresh';
  jti: string;
  /** UserDevice id when session is native-linked */
  did?: string;
}
