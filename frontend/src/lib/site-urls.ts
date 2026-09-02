/**
 * Domain helpers for public marketplace vs admin control center.
 *
 * Production:
 *   https://libyanfreelance.ly          — CLIENT + FREELANCER
 *   https://admin.libyanfreelance.ly    — SUPER_ADMIN + authorized ADMIN
 *   https://api.libyanfreelance.ly      — NestJS + Socket.IO
 *
 * Local development (no subdomain required):
 *   http://localhost:3000
 *   http://localhost:3000/admin
 *   http://localhost:4000/api
 */

const DEFAULT_SITE_URL = 'http://localhost:3000';
const DEFAULT_ADMIN_URL = 'http://localhost:3000';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, '');
}

export function getSiteUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || DEFAULT_SITE_URL,
  );
}

export function getAdminUrl(): string {
  return stripTrailingSlash(
    process.env.NEXT_PUBLIC_ADMIN_URL?.trim() || DEFAULT_ADMIN_URL,
  );
}

function hostnameFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/** Dedicated admin hostnames (production + optional local subdomain testing). */
function configuredAdminHosts(): Set<string> {
  const hosts = new Set<string>();
  const fromAdminUrl = hostnameFromUrl(getAdminUrl());
  if (fromAdminUrl) hosts.add(fromAdminUrl);

  const extra = process.env.ADMIN_HOSTS?.split(',') ?? [];
  for (const raw of extra) {
    const host = raw.trim().toLowerCase();
    if (host) hosts.add(host);
  }

  hosts.add('admin.localhost');
  hosts.add('admin.libyanfreelance.ly');

  return hosts;
}

export function normalizeHost(hostHeader: string | null): string {
  if (!hostHeader) return '';
  return hostHeader.split(':')[0]?.trim().toLowerCase() ?? '';
}

/**
 * True only when request Host is a dedicated admin subdomain.
 * On localhost (site URL === admin URL) this is always false so /admin works in-app.
 */
export function isAdminHost(hostHeader: string | null): boolean {
  const host = normalizeHost(hostHeader);
  if (!host) return false;

  const siteHost = hostnameFromUrl(getSiteUrl());
  const adminHost = hostnameFromUrl(getAdminUrl());
  if (siteHost && adminHost && siteHost === adminHost) {
    return false;
  }

  return configuredAdminHosts().has(host);
}

/** True when production uses a separate admin origin. */
export function hasSeparateAdminOrigin(): boolean {
  return getAdminUrl() !== getSiteUrl();
}

export function isAdminPath(pathname: string): boolean {
  return (
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    /^\/(ar|en)\/admin(\/|$)/.test(pathname)
  );
}

export function isAdminLoginPath(pathname: string): boolean {
  return (
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    /^\/(ar|en)\/admin\/login(\/|$)/.test(pathname)
  );
}

export function defaultAdminPath(locale = 'ar'): string {
  return locale === 'ar' ? '/admin' : `/${locale}/admin`;
}

export function defaultAdminLoginPath(locale = 'ar'): string {
  return locale === 'ar' ? '/admin/login' : `/${locale}/admin/login`;
}
