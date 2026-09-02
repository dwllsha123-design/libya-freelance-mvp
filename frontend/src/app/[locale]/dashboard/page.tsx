'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import { ClientDashboard } from '@/components/dashboard/client-dashboard';
import { FreelancerDashboard } from '@/components/dashboard/freelancer-dashboard';
import { useAuth } from '@/contexts/auth-context';
import { useProfileData } from '@/hooks/use-profile';
import { hasCompletedClientOnboarding } from '@/lib/client-onboarding';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading } = useProfileData();

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;

    if (
      user.role === 'CLIENT' &&
      !hasCompletedClientOnboarding(profile?.client)
    ) {
      router.replace('/dashboard/complete-profile');
    }
  }, [authLoading, profileLoading, user, profile, router]);

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

  if (user.role === 'ADMIN') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold text-on-surface">{t('title')}</h1>
        <p className="mt-4 text-slate-600">
          <Link href="/admin" className="font-semibold text-primary">
            {t('goToAdmin')}
          </Link>
        </p>
      </div>
    );
  }

  if (user.role === 'CLIENT') {
    if (!hasCompletedClientOnboarding(profile?.client)) {
      return <div className="p-8 text-center text-slate-500">{t('redirecting')}</div>;
    }
    return <ClientDashboard />;
  }

  return <FreelancerDashboard />;
}
