import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { IBM_Plex_Sans_Arabic, Inter, Readex_Pro } from 'next/font/google';
import '../globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { SocketProvider } from '@/contexts/socket-context';
import { PresenceProvider } from '@/hooks/use-presence';
import { AppChrome } from '@/components/layout/app-chrome';
import { WebPushEnabler } from '@/components/notifications/web-push-enabler';
import { StaffMarketplaceRedirect } from '@/components/admin/staff-marketplace-redirect';
import { routing, type AppLocale } from '@/i18n/routing';

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
});

const readexPro = Readex_Pro({
  subsets: ['latin', 'arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-readex-pro',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f9f6f0' },
    { media: '(prefers-color-scheme: dark)', color: '#090e17' },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'brand' });

  return {
    title: t('name'),
    description: t('tagline'),
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://libyanfreelance.ly'),
    alternates: {
      canonical: locale === 'en' ? '/en' : '/',
      languages: {
        'ar-LY': '/',
        en: '/en',
        'x-default': '/',
      },
    },
    openGraph: {
      title: t('name'),
      description: t('tagline'),
      locale: locale === 'en' ? 'en' : 'ar_LY',
      alternateLocale: locale === 'en' ? ['ar_LY'] : ['en'],
      type: 'website',
      siteName: 'Libyan Freelance',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('name'),
      description: t('tagline'),
    },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/brand/logo-transparent.svg', type: 'image/svg+xml' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: ['/favicon.ico'],
    },
    manifest: '/site.webmanifest',
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as AppLocale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const isArabic = locale === 'ar';

  return (
    <html
      lang={locale}
      dir={isArabic ? 'rtl' : 'ltr'}
      className={`${ibmPlexArabic.variable} ${readexPro.variable} ${inter.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className={`flex min-h-full flex-col overflow-x-hidden text-on-surface antialiased ${
          isArabic ? 'font-sans' : 'font-[family-name:var(--font-inter)]'
        }`}
      >
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <SocketProvider>
                <PresenceProvider>
                  <WebPushEnabler />
                  <StaffMarketplaceRedirect>
                    <AppChrome>{children}</AppChrome>
                  </StaffMarketplaceRedirect>
                </PresenceProvider>
              </SocketProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
