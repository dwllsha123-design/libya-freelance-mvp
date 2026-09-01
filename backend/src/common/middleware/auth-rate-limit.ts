import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

function noopRateLimit(_req: Request, _res: Response, next: NextFunction) {
  next();
}

export function isRateLimitDisabled(): boolean {
  return process.env.NODE_ENV === 'test' || process.env.REQUIRE_E2E === '1';
}

export function createAuthRateLimiter(max: number) {
  if (isRateLimitDisabled()) {
    return noopRateLimit;
  }

  return rateLimit({
    windowMs: 15 * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      statusCode: 429,
      message: 'عدد كبير من المحاولات. حاول لاحقاً.',
    },
  });
}

export const authRateLimiters = {
  login: createAuthRateLimiter(10),
  register: createAuthRateLimiter(5),
  forgotPassword: createAuthRateLimiter(5),
  resetPassword: createAuthRateLimiter(10),
  refresh: createAuthRateLimiter(30),
};
