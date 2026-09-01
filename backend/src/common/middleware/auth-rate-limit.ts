import rateLimit from 'express-rate-limit';

export function createAuthRateLimiter(max: number) {
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
