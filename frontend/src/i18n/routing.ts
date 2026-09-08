import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'as-needed',
  // Always serve Arabic at `/` for the Libyan market — do not redirect
  // visitors to `/en` based on Accept-Language or NEXT_LOCALE cookie.
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
