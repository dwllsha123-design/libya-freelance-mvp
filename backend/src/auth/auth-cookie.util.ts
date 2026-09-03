import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const CLIENT_REQUEST_HEADER = 'x-client-request';
export const CLIENT_REQUEST_VALUE = 'libya-freelance';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function resolveSameSite(): CookieOptions['sameSite'] {
  const configured = process.env.AUTH_COOKIE_SAME_SITE?.trim().toLowerCase();
  if (configured === 'none' || configured === 'lax' || configured === 'strict') {
    return configured;
  }

  const isProduction = process.env.NODE_ENV === 'production';
  // Same registrable domain (e.g. *.libyanfreelance.ly) works with strict.
  // Cross-origin Railway *.up.railway.app hosts require AUTH_COOKIE_SAME_SITE=none.
  return isProduction ? 'strict' : 'lax';
}

export function getRefreshCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';
  const sameSite = resolveSameSite();
  const domain = process.env.AUTH_COOKIE_DOMAIN?.trim() || undefined;

  return {
    httpOnly: true,
    secure: isProduction || sameSite === 'none',
    sameSite,
    domain,
    path: '/api/auth',
    maxAge: SEVEN_DAYS_MS,
  };
}

export function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie(REFRESH_COOKIE, refreshToken, getRefreshCookieOptions());
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, getRefreshCookieOptions());
}
