import type { CookieOptions, Response } from 'express';
import { parseDurationToMs } from '../common/utils/token.util.js';

export const REFRESH_COOKIE = 'refresh_token';
export const CLIENT_REQUEST_HEADER = 'x-client-request';
export const CLIENT_REQUEST_VALUE = 'libya-freelance';

const DEFAULT_REFRESH_TTL = '7d';

function resolveSameSite(): CookieOptions['sameSite'] {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  if (configured === 'none' || configured === 'lax' || configured === 'strict') {
    return configured;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  // api.libyanfreelance.ly and the frontends share the registrable domain
  // libyanfreelance.ly, so requests between them are same-site and both `lax`
  // and `strict` deliver the cookie. `none` is only needed when the API and the
  // frontend live on different registrable domains (e.g. *.up.railway.app).
  return isProduction ? 'strict' : 'lax';
}

/** Cookie lifetime must track the refresh token TTL, not a separate constant. */
function resolveMaxAge(): number {
  const configured =
    process.env.JWT_REFRESH_EXPIRES_IN?.trim() || DEFAULT_REFRESH_TTL;

  try {
    return parseDurationToMs(configured);
  } catch {
    return parseDurationToMs(DEFAULT_REFRESH_TTL);
  }
}

export function getRefreshCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = resolveSameSite();
  // Left unset in production: the cookie stays host-only on the API hostname.
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    domain,
    path: '/api/auth',
    maxAge: resolveMaxAge(),
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, getRefreshCookieOptions());
}
