'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';
import { SiteFooter } from '@/components/layout/site-footer';
import { NotificationToastHost } from '@/components/notifications/notification-toast';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin =
    pathname === '/admin' ||
    pathname.startsWith('/admin/') ||
    /^\/(ar|en)\/admin(\/|$)/.test(pathname);

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <NotificationToastHost />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter />
    </>
  );
}
