'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import { useLocale } from 'next-intl';
import type { AppLocale } from '@/i18n/routing';
import { IdentityVerifiedBadge } from '@/components/trust/identity-pro-badges';

type VerificationMe = {
  id?: string;
  status: string;
  identityVerified: boolean;
  fullNameAsOnId?: string | null;
  nationalIdLast4?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  expiresAt?: string | null;
  documents?: Array<{ id: string; mimeType: string; sizeBytes: number }>;
};

export default function VerificationDashboardPage() {
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<VerificationMe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fullNameAsOnId, setFullNameAsOnId] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [freelancerNote, setFreelancerNote] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    if (!accessToken) return;
    const me = await authenticatedRequest<VerificationMe>('/verification/me', accessToken);
    setData(me);
  }

  useEffect(() => {
    if (!user || user.role !== 'FREELANCER' || !accessToken) return;
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accessToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !files?.length) return;
    setSubmitting(true);
    setError(null);
    try {
      const form = new FormData();
      form.append('fullNameAsOnId', fullNameAsOnId);
      form.append('nationalId', nationalId);
      if (freelancerNote.trim()) form.append('freelancerNote', freelancerNote.trim());
      Array.from(files).forEach((f) => form.append('documents', f));
      const me = await authenticatedRequest<VerificationMe>('/verification/submit', accessToken, {
        method: 'POST',
        body: form,
      });
      setData(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) return <p className="p-6">{tCommon('loading')}</p>;
  if (!user || user.role !== 'FREELANCER') {
    return <p className="p-6">هذه الصفحة للمستقلين فقط</p>;
  }

  const canSubmit =
    !data ||
    data.status === 'NOT_SUBMITTED' ||
    data.status === 'REJECTED' ||
    data.status === 'SUSPENDED' ||
    data.status === 'EXPIRED';

  return (
    <div className="page-gutter mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">توثيق الهوية</h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          التوثيق مستقل عن اشتراك Pro. الدفع لا يجعلك موثّقًا تلقائيًا.
        </p>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {data ? (
        <div className="space-y-2 rounded-xl border border-outline-variant/40 bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">الحالة: {data.status}</span>
            {data.identityVerified ? <IdentityVerifiedBadge /> : null}
          </div>
          {data.rejectionReason ? (
            <p className="text-sm text-red-700">سبب الرفض: {data.rejectionReason}</p>
          ) : null}
          {data.nationalIdLast4 ? (
            <p className="text-xs text-on-surface-variant">آخر 4 أرقام: ••••{data.nationalIdLast4}</p>
          ) : null}
        </div>
      ) : null}

      {canSubmit ? (
        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-outline-variant/40 bg-surface p-4">
          <label className="block text-sm">
            الاسم كما في الهوية
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2"
              value={fullNameAsOnId}
              onChange={(e) => setFullNameAsOnId(e.target.value)}
              required
              minLength={3}
            />
          </label>
          <label className="block text-sm">
            رقم الهوية الوطنية
            <input
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              required
              pattern="\d{4,20}"
              inputMode="numeric"
            />
            <span className="mt-1 block text-xs text-on-surface-variant">
              نحفظ آخر 4 أرقام فقط للتطابق — لا نخزّن الرقم كاملًا.
            </span>
          </label>
          <label className="block text-sm">
            ملاحظة (اختياري)
            <textarea
              className="mt-1 w-full rounded-lg border border-outline-variant/50 bg-transparent px-3 py-2"
              value={freelancerNote}
              onChange={(e) => setFreelancerNote(e.target.value)}
              rows={3}
            />
          </label>
          <label className="block text-sm">
            مستندات (صورة أو PDF)
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              multiple
              required
              onChange={(e) => setFiles(e.target.files)}
            />
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:opacity-60"
          >
            {submitting ? 'جاري الإرسال...' : 'إرسال طلب التوثيق'}
          </button>
        </form>
      ) : (
        <p className="text-sm text-on-surface-variant">طلبك قيد المراجعة أو موثّق بالفعل.</p>
      )}

      <p className="text-sm">
        للاشتراك في Pro بعد التوثيق:{' '}
        <Link href="/dashboard/pro" className="text-primary underline">
          ليبي فريلانس برو
        </Link>
      </p>
    </div>
  );
}
