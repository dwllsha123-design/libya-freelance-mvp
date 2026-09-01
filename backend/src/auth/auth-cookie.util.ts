import type { CookieOptions, Response } from 'express';

export const REFRESH_COOKIE = 'refresh_token';
export const CLIENT_REQUEST_HEADER = 'x-client-request';
export const CLIENT_REQUEST_VALUE = 'libya-freelance';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export function getRefreshCookieOptions(): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
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
