import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import {
  defaultAdminLoginPath,
  defaultAdminPath,
  getAdminUrl,
  hasSeparateAdminOrigin,
  isAdminHost,
  isAdminLoginPath,
  isAdminPath,
} from './lib/site-urls';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const host = request.headers.get('host');
  const { pathname, search } = request.nextUrl;
  const onAdminHost = isAdminHost(host);

  // Production public host: never serve a second admin app — redirect to admin subdomain
  if (!onAdminHost && isAdminPath(pathname) && hasSeparateAdminOrigin()) {
    return NextResponse.redirect(new URL(`${pathname}${search}`, getAdminUrl()));
  }

  // Dedicated admin host: only admin surfaces (incl. /admin/login)
  if (onAdminHost) {
    if (isAdminLoginPath(pathname) || isAdminPath(pathname)) {
      return intlMiddleware(request);
    }
    const localeMatch = pathname.match(/^\/(ar|en)(\/|$)/);
    const locale = localeMatch?.[1] ?? routing.defaultLocale;
    // Unauthenticated landing → admin login; otherwise admin home
    const target =
      pathname === '/' || pathname === `/${locale}`
        ? defaultAdminLoginPath(locale)
        : defaultAdminPath(locale);
    const url = request.nextUrl.clone();
    url.pathname = target;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/',
    '/(ar|en)/:path*',
    '/((?!api|_next|_vercel|.*\\..*).*)',
  ],
};
