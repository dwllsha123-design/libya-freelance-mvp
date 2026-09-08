'use client';

import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { ClientDashboard } from '@/components/dashboard/client-dashboard';
import { FreelancerDashboard } from '@/components/dashboard/freelancer-dashboard';
import { useAuth } from '@/contexts/auth-context';
import { useProfileData } from '@/hooks/use-profile';
import { hasCompletedClientOnboarding } from '@/lib/client-onboarding';
import { getAdminHomeHref, isStaffRole } from '@/lib/roles';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfileData();

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;

    if (isStaffRole(user.role)) {
      window.location.assign(getAdminHomeHref(locale));
      return;
    }

    if (
      user.role === 'CLIENT' &&
      !hasCompletedClientOnboarding(profile?.client)
    ) {
      router.replace('/dashboard/complete-profile');
    }
  }, [authLoading, profileLoading, user, profile, router, locale]);

  if (authLoading || (user?.role === 'CLIENT' && profileLoading)) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4 text-slate-600">{t('loginRequired')}</p>
        <Link href="/login" className="font-semibold text-primary">
          {t('login')}
        </Link>
      </div>
    );
  }

  if (isStaffRole(user.role)) {
    return <div className="p-8 text-center text-slate-500">{t('redirecting')}</div>;
  }

  if (user.role === 'CLIENT') {
    if (!hasCompletedClientOnboarding(profile?.client)) {
      return <div className="p-8 text-center text-slate-500">{t('redirecting')}</div>;
    }
    return <ClientDashboard />;
  }

  return <FreelancerDashboard />;
}
