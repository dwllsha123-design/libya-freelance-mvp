'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { AdminShell } from '@/components/admin/admin-shell';
import { getSiteUrl, isAdminLoginPath } from '@/lib/site-urls';

function isStaff(role: string | undefined) {
  return role === 'ADMIN' || role === 'SUPER_ADMIN';
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const onLoginPage = isAdminLoginPath(pathname);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      if (!onLoginPage) {
        router.replace('/admin/login');
      }
      return;
    }

    if (!isStaff(user.role) || user.status !== 'ACTIVE') {
      if (onLoginPage) return;
      // Non-staff must not stay in the control center
      void logout().finally(() => {
        window.location.href = getSiteUrl();
      });
      return;
    }

    if (onLoginPage) {
      router.replace('/admin');
    }
  }, [user, isLoading, router, onLoginPage, logout]);

  if (onLoginPage) {
    return <>{children}</>;
  }

  if (isLoading || !user || !isStaff(user.role)) {
    return <div className="p-8 text-center">{t('verifying')}</div>;
  }

  return <AdminShell>{children}</AdminShell>;
}
