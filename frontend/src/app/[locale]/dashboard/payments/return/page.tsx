'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { usePaymentsApi, type PaymentRecord } from '@/hooks/use-payments';

function PaymentReturnContent() {
  const t = useTranslations('payments');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tEscrow = useTranslations('escrow');
  const searchParams = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const { user, isLoading: authLoading } = useAuth();
  const paymentsApi = usePaymentsApi();
  const [payment, setPayment] = useState<PaymentRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollDone, setPollDone] = useState(false);

  const STATUS_LABELS: Record<string, string> = useMemo(
    () => ({
      PENDING: t('statusPending'),
      PROCESSING: t('statusProcessing'),
      SUCCEEDED: t('statusSucceeded'),
      FAILED: t('statusFailed'),
      CANCELLED: t('statusCancelled'),
      REFUNDED: t('statusRefunded'),
    }),
    [t],
  );

  const shouldPoll = Boolean(user && paymentId);
  const isLoading = authLoading || (shouldPoll && !pollDone && !error);

  useEffect(() => {
    if (!shouldPoll) return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      try {
        const data = await paymentsApi.getPayment(paymentId!);
        if (cancelled) return;
        setPayment(data);
        if ((data.status === 'PROCESSING' || data.status === 'PENDING') && attempts < 8) {
          attempts += 1;
          window.setTimeout(() => void poll(), 2000);
          return;
        }
        setPollDone(true);
      } catch {
        if (!cancelled) {
          setError(t('verifyFailed'));
          setPollDone(true);
        }
      }
    }

    void poll();

    return () => {
      cancelled = true;
    };
  }, [shouldPoll, paymentId, paymentsApi, t]);

  if (isLoading) {
    return <div className="p-8 text-center">{t('verifying')}</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4">{t('loginRequired')}</p>
        <Link href="/login" className="text-primary underline">
          {tDashboard('login')}
        </Link>
      </div>
    );
  }

  if (!paymentId) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p>{t('noPaymentId')}</p>
        <Link href="/dashboard/escrow" className="mt-4 inline-block text-primary underline">
          {tEscrow('escrowHistory')}
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-red-600">{error}</p>
        <Link href="/dashboard/escrow" className="mt-4 inline-block text-primary underline">
          {t('backToEscrow')}
        </Link>
      </div>
    );
  }

  const succeeded = payment?.status === 'SUCCEEDED';

  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-bold text-on-surface">{t('resultTitle')}</h1>
      {payment ? (
        <div className="mt-4 space-y-3 rounded-xl border bg-white p-5">
          <p>
            <span className="text-slate-500">{t('status')} </span>
            <strong>{STATUS_LABELS[payment.status] ?? payment.status}</strong>
          </p>
          <p>
            <span className="text-slate-500">{t('amount')} </span>
            {payment.amount} {payment.currency}
          </p>
          {payment.failureMessage ? (
            <p className="text-sm text-red-600">{payment.failureMessage}</p>
          ) : null}
          {succeeded ? (
            <p className="text-sm text-primary">{t('successMessage')}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Link href="/dashboard/escrow" className="rounded-lg border px-4 py-2 text-sm">
          {tEscrow('escrowHistory')}
        </Link>
        <Link href="/dashboard/projects" className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
          {tDashboard('myProjects')}
        </Link>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  const tCommon = useTranslations('common');

  return (
    <Suspense fallback={<div className="p-8 text-center">{tCommon('loadingPage')}</div>}>
      <PaymentReturnContent />
    </Suspense>
  );
}
