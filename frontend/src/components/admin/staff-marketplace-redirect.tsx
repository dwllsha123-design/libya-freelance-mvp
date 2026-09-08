'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isAdminLoginPath, isAdminPath } from '@/lib/site-urls';
import { getAdminHomeHref, isStaffRole } from '@/lib/roles';

/**
 * Hard fallback: staff sessions on marketplace surfaces are sent back to admin.
 */
export function StaffMarketplaceRedirect({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const locale = useLocale();

  useEffect(() => {
    if (isLoading || !user || !isStaffRole(user.role)) return;
    if (isAdminPath(pathname) || isAdminLoginPath(pathname)) return;
    window.location.assign(getAdminHomeHref(locale));
  }, [user, isLoading, pathname, locale]);

  return <>{children}</>;
}
