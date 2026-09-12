'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, apiRequest, getApiErrorMessage, ApiError } from '@/lib/api';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { IdentityVerifiedBadge, ProBadge } from '@/components/trust/identity-pro-badges';

type ProPlan = {
  code: string;
  nameAr: string;
  nameEn: string;
  price: number;
  currency: string;
  durationDays: number;
  portfolioItemLimit: number;
};

type SubscriptionMe = {
  plan: ProPlan;
  identityVerified: boolean;
  isPro: boolean;
  daysRemaining: number;
  subscription: {
    status: string;
    startedAt: string | null;
    expiresAt: string | null;
  } | null;
  payment: {
    simulated: boolean;
    canActivateSimulated: boolean;
  };
};

type Analytics = {
  profileViewsLast30Days: number;
  proposalsLast30Days: number;
  proposalsByStatus: Record<string, number>;
};

export default function ProDashboardPage() {
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [plan, setPlan] = useState<ProPlan | null>(null);
  const [me, setMe] = useState<SubscriptionMe | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await apiRequest<ProPlan>('/subscriptions/plans/pro', {}, locale);
        if (!cancelled) setPlan(p);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  useEffect(() => {
    if (!user || user.role !== 'FREELANCER' || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        void authenticatedRequest('/subscriptions/pro/page-view', accessToken, {
          method: 'POST',
          body: JSON.stringify({}),
        }).catch(() => undefined);
        const data = await authenticatedRequest<SubscriptionMe>('/subscriptions/me', accessToken);
        if (!cancelled) setMe(data);
        if (data.isPro) {
          try {
            const a = await authenticatedRequest<Analytics>(
              '/subscriptions/pro/analytics',
              accessToken,
            );
            if (!cancelled) setAnalytics(a);
          } catch {
            /* analytics optional */
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, accessToken, locale]);

  async function checkout() {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await authenticatedRequest<{
        status: string;
        activationBlocked?: boolean;
        message?: string;
        isRenewal?: boolean;
      }>('/subscriptions/pro/checkout', accessToken, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      if (result.activationBlocked) {
        setMessage(result.message ?? 'التفعيل معلّق حتى توفر بوابة دفع حقيقية.');
      } else {
        setMessage(result.isRenewal ? 'تم تجديد الاشتراك.' : 'تم تفعيل الاشتراك.');
      }
      const data = await authenticatedRequest<SubscriptionMe>('/subscriptions/me', accessToken);
      setMe(data);
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 503 ||
          (err.details &&
            typeof err.details === 'object' &&
            (err.details as { code?: string }).code ===
              'PAYMENT_PROVIDER_UNAVAILABLE'))
      ) {
        setError('الدفع الإلكتروني غير متاح حالياً. سيتم تفعيله قريباً.');
      } else {
        setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
      }
    } finally {
      setBusy(false);
    }
  }

  if (authLoading) return <p className="p-6">{tCommon('loading')}</p>;
  if (!user || user.role !== 'FREELANCER') {
    return <p className="p-6">هذه الصفحة للمستقلين فقط</p>;
  }

  const displayPlan = me?.plan ?? plan;
  const priceLabel = displayPlan
    ? `${displayPlan.price} ${displayPlan.currency === 'LYD' ? 'د.ل' : displayPlan.currency}`
    : '—';

  return (
    <div className="page-gutter mx-auto max-w-2xl space-y-6 py-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-bold text-on-surface">
          {displayPlan?.nameAr ?? 'ليبي فريلانس برو'}
        </h1>
        {me?.isPro ? <ProBadge /> : null}
        {me?.identityVerified ? <IdentityVerifiedBadge /> : null}
      </div>
      <p className="text-sm text-on-surface-variant">
        {priceLabel} / {displayPlan?.durationDays ?? 30} يومًا — السعر من الخطة في الخادم وليس ثابتًا في الواجهة.
      </p>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      <ul className="list-disc space-y-1 ps-5 text-sm text-on-surface">
        <li>شارة PRO على الملف</li>
        <li>تحليلات مشاهدات الملف وأداء العروض</li>
        <li>حد أعلى لمعرض الأعمال ({displayPlan?.portfolioItemLimit ?? 40} عنصرًا)</li>
        <li>تعزيز ترتيب محدود (بعد الجودة والثقة)</li>
      </ul>

      {!me?.identityVerified ? (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm">
          توثيق الهوية مطلوب قبل الاشتراك.{' '}
          <Link href="/dashboard/verification" className="underline">
            ابدأ التوثيق
          </Link>
        </p>
      ) : null}

      {me?.isPro ? (
        <div className="space-y-2 rounded-xl border border-outline-variant/40 bg-surface p-4 text-sm">
          <p>
            الحالة: <strong>Active</strong>
          </p>
          <p>البداية: {me.subscription?.startedAt?.slice(0, 10) ?? '—'}</p>
          <p>الانتهاء: {me.subscription?.expiresAt?.slice(0, 10) ?? '—'}</p>
          <p>الأيام المتبقية: {me.daysRemaining}</p>
          {analytics ? (
            <div className="mt-3 border-t border-outline-variant/30 pt-3">
              <p>مشاهدات الملف (30 يومًا): {analytics.profileViewsLast30Days}</p>
              <p>العروض (30 يومًا): {analytics.proposalsLast30Days}</p>
            </div>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => void checkout()}
            className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            تجديد — {priceLabel}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {me?.subscription?.status === 'EXPIRED' ? (
            <p className="text-sm font-medium text-on-surface">انتهى اشتراك Pro</p>
          ) : null}
          <button
            type="button"
            disabled={busy || !me?.identityVerified || !displayPlan}
            onClick={() => void checkout()}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            اشترك الآن — {priceLabel}
          </button>
        </div>
      )}
    </div>
  );
}
