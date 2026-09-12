import type { Request } from 'express';

/**
 * Extract client IP using Express `req.ip` with trust proxy = 1.
 * Prefer the leftmost X-Forwarded-For hop only when Express already
 * resolved `req.ip` from the trusted proxy chain.
 */
export function extractClientIp(req: Request): string | null {
  const fromExpress = typeof req.ip === 'string' ? req.ip.trim() : '';
  if (fromExpress) {
    return fromExpress.replace(/^::ffff:/, '');
  }

  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    // With trust proxy=1 Express normally sets req.ip; this is a last resort.
    const first = forwarded.split(',')[0]?.trim();
    return first ? first.replace(/^::ffff:/, '') : null;
  }

  const remote = req.socket?.remoteAddress?.trim();
  return remote ? remote.replace(/^::ffff:/, '') : null;
}
