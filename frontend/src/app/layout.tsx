import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { SocketProvider } from '@/contexts/socket-context';
import { AppChrome } from '@/components/layout/app-chrome';
import { PLATFORM_NAME_AR, PLATFORM_NAME_EN, PLATFORM_TAGLINE_AR } from '@/lib/branding';

const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ibm-plex-arabic',
});

export const metadata: Metadata = {
  title: `${PLATFORM_NAME_AR} | ${PLATFORM_NAME_EN}`,
  description: PLATFORM_TAGLINE_AR,
  icons: {
    icon: '/logo-icon.png',
    apple: '/logo-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${ibmPlexArabic.variable} h-full`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col overflow-x-hidden bg-background font-sans text-on-surface antialiased">
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppChrome>{children}</AppChrome>
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
