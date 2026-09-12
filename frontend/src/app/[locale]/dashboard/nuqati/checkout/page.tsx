'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';

/**
 * Paid Nuqati checkout is disabled for the commercial release.
 * Route kept so old links do not 404; always shows earn-only messaging.
 */
function NuqatiCheckoutDisabledContent() {
  const t = useTranslations('nuqati');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== 'FREELANCER') {
      router.replace('/dashboard');
      return;
    }
    setReady(true);
  }, [authLoading, user, router]);

  if (authLoading || !ready) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="text-2xl font-bold text-on-surface">{t('paidPurchaseDisabled')}</h1>
      <p className="mt-3 text-sm text-on-surface-variant">{t('paidPurchaseDisabledBody')}</p>
      <Link
        href="/dashboard/nuqati"
        className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
      >
        {t('backToNuqati')}
      </Link>
    </div>
  );
}

export default function NuqatiCheckoutPage() {
  const tCommon = useTranslations('common');

  return (
    <Suspense fallback={<div className="p-8 text-center">{tCommon('loadingPage')}</div>}>
      <NuqatiCheckoutDisabledContent />
    </Suspense>
  );
}
