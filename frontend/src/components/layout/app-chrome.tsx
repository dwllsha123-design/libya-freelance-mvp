'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/navbar';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main className="flex flex-1 flex-col">{children}</main>
    </>
  );
}
