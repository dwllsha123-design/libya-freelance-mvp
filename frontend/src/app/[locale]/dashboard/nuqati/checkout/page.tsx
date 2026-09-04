'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useNuqatiApi, type NuqatiCheckoutResult } from '@/hooks/use-nuqati';
import type { NuqatiDashboard } from '@/lib/nuqati';
import type { AppLocale } from '@/i18n/routing';

function NuqatiCheckoutContent() {
  const t = useTranslations('nuqati');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams.get('packageId') ?? '';
  const { user, isLoading: authLoading } = useAuth();
  const api = useNuqatiApi();

  const [dashboard, setDashboard] = useState<NuqatiDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<NuqatiCheckoutResult | null>(
    null,
  );
  const [selectedMethod, setSelectedMethod] = useState('electronic');

  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const selectedPackage = useMemo(
    () => (dashboard?.packages ?? []).find((pkg) => pkg.id === packageId) ?? null,
    [dashboard, packageId],
  );

  useEffect(() => {
    if (!authLoading && user && user.role !== 'FREELANCER') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role !== 'FREELANCER') return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.getDashboard();
        if (!cancelled) setDashboard(res);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, api, t]);

  async function handlePay() {
    if (!selectedPackage || isPaying) return;
    setIsPaying(true);
    setError(null);
    try {
      const result = await api.initiateCheckout(selectedPackage.id);
      setCheckoutResult(result);

      // Future: if result.requiresRedirect && result.checkoutUrl → window.location.href
      if (result.checkoutUrl && result.requiresRedirect) {
        window.location.href = result.checkoutUrl;
        return;
      }
    } catch {
      setError(t('purchaseFailed'));
    } finally {
      setIsPaying(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="p-8 text-center text-slate-500">{t('loading')}</div>;
  }

  if (!user || user.role !== 'FREELANCER') return null;

  if (!packageId || !selectedPackage) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="text-on-surface">{t('checkoutPackageMissing')}</p>
        <Link
          href="/dashboard/nuqati"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          {t('backToNuqati')}
        </Link>
      </div>
    );
  }

  const showComingSoon = Boolean(checkoutResult?.comingSoon);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        href="/dashboard/nuqati"
        className="text-sm font-semibold text-primary hover:underline"
      >
        {t('backToNuqati')}
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-on-surface">{t('checkoutTitle')}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">{t('checkoutSubtitle')}</p>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {showComingSoon ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-center">
          <p className="text-2xl font-bold text-amber-800">{t('comingSoon')}</p>
          <p className="mt-2 text-sm text-amber-900">
            {checkoutResult?.message ?? t('comingSoonBody')}
          </p>
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-outline-variant/40 bg-surface p-5">
        <h2 className="text-sm font-semibold text-slate-500">{t('checkoutOrderSummary')}</h2>
        <div className="mt-3 flex items-baseline justify-between gap-4">
          <p className="text-xl font-bold text-primary">
            {selectedPackage.points.toLocaleString(numberLocale)} {t('point')}
          </p>
          <p className="text-lg font-semibold text-on-surface">
            {selectedPackage.priceLyd.toLocaleString(numberLocale)} {tCommon('lyd')}
          </p>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-outline-variant/40 bg-surface p-5">
        <h2 className="text-sm font-semibold text-slate-500">{t('checkoutPaymentMethods')}</h2>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => setSelectedMethod('electronic')}
            className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-start transition ${
              selectedMethod === 'electronic'
                ? 'border-primary bg-primary/5'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <p className="font-semibold text-on-surface">{t('paymentMethodElectronic')}</p>
              <p className="mt-0.5 text-xs text-slate-500">{t('paymentMethodElectronicHint')}</p>
            </div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              {t('comingSoon')}
            </span>
          </button>
        </div>
      </section>

      <button
        type="button"
        disabled={isPaying || showComingSoon}
        onClick={() => void handlePay()}
        className="mt-6 w-full rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-container disabled:opacity-60"
      >
        {isPaying ? tCommon('saving') : t('payNow')}
      </button>

      {showComingSoon ? (
        <Link
          href="/dashboard/nuqati"
          className="mt-4 block text-center text-sm font-semibold text-primary hover:underline"
        >
          {t('backToNuqati')}
        </Link>
      ) : null}
    </div>
  );
}

export default function NuqatiCheckoutPage() {
  const tCommon = useTranslations('common');

  return (
    <Suspense fallback={<div className="p-8 text-center">{tCommon('loadingPage')}</div>}>
      <NuqatiCheckoutContent />
    </Suspense>
  );
}
