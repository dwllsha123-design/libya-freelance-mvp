'use client';

import { useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isAdminLoginPath, isAdminPath } from '@/lib/site-urls';
import { getAdminHomeHref, isStaffRole } from '@/lib/roles';
import { isStaffBlockedMarketplacePath } from '@/lib/staff-marketplace-access';

/**
 * Redirect staff only from authenticated marketplace account/action routes.
 * Public marketing and browse pages remain viewable.
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
    if (!isStaffBlockedMarketplacePath(pathname)) return;
    window.location.assign(getAdminHomeHref(locale));
  }, [user, isLoading, pathname, locale]);

  return <>{children}</>;
}
