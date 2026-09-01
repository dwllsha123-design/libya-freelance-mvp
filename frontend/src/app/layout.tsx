import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Cairo } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/auth-context';
import { SocketProvider } from '@/contexts/socket-context';
import { AppChrome } from '@/components/layout/app-chrome';
import { PLATFORM_NAME_AR, PLATFORM_NAME_EN, PLATFORM_TAGLINE_AR } from '@/lib/branding';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
});

export const metadata: Metadata = {
  title: `${PLATFORM_NAME_AR} | ${PLATFORM_NAME_EN}`,
  description: PLATFORM_TAGLINE_AR,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#F6F8FA] font-sans text-[#0B132B] antialiased">
        <AuthProvider>
          <SocketProvider>
            <AppChrome>{children}</AppChrome>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
