const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://libyanfreelance.ly';

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

export function isValidPublicUsernameParam(username: string): boolean {
  const normalized = username.trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 30) return false;
  if (normalized.includes('..') || normalized.includes('/') || normalized.includes('\\')) {
    return false;
  }
  return USERNAME_PATTERN.test(normalized);
}

/**
 * App path for a public freelancer permalink (no locale prefix).
 * Returns null when username is missing/invalid so callers never build `/u/undefined`.
 */
export function publicProfilePath(
  username: string | null | undefined,
): string | null {
  if (!username || typeof username !== 'string') return null;
  const normalized = username.trim().toLowerCase();
  if (!isValidPublicUsernameParam(normalized)) return null;
  return `/u/${normalized}`;
}

/** Absolute shareable URL, e.g. https://libyanfreelance.ly/u/hussin-altoomy */
export function publicProfileAbsoluteUrl(
  username: string,
  siteUrl: string = SITE_URL,
): string | null {
  const path = publicProfilePath(username);
  if (!path) return null;
  const base = siteUrl.replace(/\/$/, '');
  return `${base}${path}`;
}

export function isSafePublicImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
