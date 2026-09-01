'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';
import { useAdminApi, type AdminEscrowDispute } from '@/hooks/use-admin';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';

const DISPUTE_STATUS_LABELS: Record<string, string> = {
  OPEN: 'مفتوح',
  UNDER_REVIEW: 'قيد المراجعة',
  RESOLVED_REFUND_CLIENT: 'استرداد للعميل',
  RESOLVED_RELEASE_FREELANCER: 'تحرير للمستقل',
  CLOSED: 'مغلق',
};

type Tab = 'open' | 'resolved';
type ResolveOutcome = 'REFUND_CLIENT' | 'RELEASE_FREELANCER';

function ResolveDisputeModal({
  dispute,
  isLoading,
  onClose,
  onResolve,
}: {
  dispute: AdminEscrowDispute;
  isLoading: boolean;
  onClose: () => void;
  onResolve: (resolution: string, outcome: ResolveOutcome) => void;
}) {
  const [resolution, setResolution] = useState('');
  const [outcome, setOutcome] = useState<ResolveOutcome>('RELEASE_FREELANCER');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="إغلاق"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-on-surface">حل النزاع</h3>
        <p className="mt-1 text-sm text-slate-500">{dispute.escrow.project.title}</p>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p>
            <strong>المبلغ:</strong>{' '}
            {formatCurrency(dispute.escrow.amount, dispute.escrow.currency)}
          </p>
          <p className="mt-1">
            <strong>سبب النزاع:</strong> {dispute.reason}
          </p>
        </div>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-sm font-medium text-on-surface">القرار</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-primary">
            <input
              type="radio"
              name="outcome"
              value="RELEASE_FREELANCER"
              checked={outcome === 'RELEASE_FREELANCER'}
              onChange={() => setOutcome('RELEASE_FREELANCER')}
              className="mt-1"
            />
            <span className="text-sm">
              <strong>تحرير للمستقل</strong>
              <span className="block text-slate-500">
                {formatCurrency(dispute.escrow.freelancerPayout, dispute.escrow.currency)} →{' '}
                {dispute.escrow.freelancer.name}
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border p-3 has-[:checked]:border-primary">
            <input
              type="radio"
              name="outcome"
              value="REFUND_CLIENT"
              checked={outcome === 'REFUND_CLIENT'}
              onChange={() => setOutcome('REFUND_CLIENT')}
              className="mt-1"
            />
            <span className="text-sm">
              <strong>استرداد للعميل</strong>
              <span className="block text-slate-500">
                {formatCurrency(dispute.escrow.amount, dispute.escrow.currency)} →{' '}
                {dispute.escrow.client.name}
              </span>
            </span>
          </label>
        </fieldset>

        <label className="mt-4 block text-sm font-medium" htmlFor="resolution">
          ملاحظة القرار (تُرسل للطرفين)
        </label>
        <textarea
          id="resolution"
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          placeholder="اشرح سبب القرار..."
        />

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">
            إلغاء
          </button>
          <button
            type="button"
            disabled={isLoading || resolution.trim().length < 5}
            onClick={() => onResolve(resolution.trim(), outcome)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? 'جاري الحفظ...' : 'تأكيد القرار'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisputeCard({
  dispute,
  tab,
  onResolve,
}: {
  dispute: AdminEscrowDispute;
  tab: Tab;
  onResolve?: (dispute: AdminEscrowDispute) => void;
}) {
  const isResolved = tab === 'resolved';
  const tone = isResolved ? 'neutral' : 'warning';

  return (
    <article className="rounded-xl border bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={`/projects/${dispute.escrow.project.slug}`}
            className="font-semibold text-on-surface hover:text-primary"
          >
            {dispute.escrow.project.title}
          </Link>
          <p className="mt-1 text-sm text-slate-500">
            فُتح {new Date(dispute.createdAt).toLocaleString('ar-LY')}
            {dispute.resolvedAt
              ? ` · حُل ${new Date(dispute.resolvedAt).toLocaleString('ar-LY')}`
              : ''}
          </p>
        </div>
        <StatusBadge
          label={DISPUTE_STATUS_LABELS[dispute.status] ?? dispute.status}
          tone={tone}
        />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-slate-500">المبلغ المحجوز</dt>
          <dd className="font-semibold">
            {formatCurrency(dispute.escrow.amount, dispute.escrow.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">صافي المستقل</dt>
          <dd>
            {formatCurrency(dispute.escrow.freelancerPayout, dispute.escrow.currency)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">العميل</dt>
          <dd>{dispute.escrow.client.name}</dd>
        </div>
        <div>
          <dt className="text-slate-500">المستقل</dt>
          <dd>{dispute.escrow.freelancer.name}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        <p className="font-medium">سبب النزاع</p>
        <p className="mt-1 whitespace-pre-wrap">{dispute.reason}</p>
        <p className="mt-2 text-xs text-amber-800">
          فُتح بواسطة: {dispute.openedBy.name}
        </p>
      </div>

      {isResolved && dispute.resolution ? (
        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <p className="font-medium text-on-surface">قرار الإدارة</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-700">{dispute.resolution}</p>
          {dispute.resolvedBy ? (
            <p className="mt-2 text-xs text-slate-500">بواسطة: {dispute.resolvedBy.name}</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {!isResolved && onResolve ? (
          <button
            type="button"
            onClick={() => onResolve(dispute)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            حل النزاع
          </button>
        ) : null}
        <Link
          href={`/admin/projects/${dispute.escrow.project.id}`}
          className="rounded-lg border px-4 py-2 text-sm"
        >
          عرض المشروع
        </Link>
      </div>
    </article>
  );
}

export default function AdminDisputesPage() {
  const api = useAdminApi();
  const [tab, setTab] = useState<Tab>('open');
  const [disputes, setDisputes] = useState<AdminEscrowDispute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<AdminEscrowDispute | null>(null);
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await api.escrowDisputes(tab);
        if (!cancelled) setDisputes(data);
      } catch {
        if (!cancelled) setError('فشل تحميل النزاعات');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, api]);

  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.escrowDisputes(tab);
      setDisputes(data);
    } catch {
      setError('فشل تحميل النزاعات');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResolve(resolution: string, outcome: ResolveOutcome) {
    if (!resolving) return;
    setIsActing(true);
    setError(null);
    try {
      await api.resolveEscrowDispute(resolving.id, { resolution, outcome });
      setResolving(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل حل النزاع');
    } finally {
      setIsActing(false);
    }
  }

  const emptyMessage =
    tab === 'open' ? 'لا توجد نزاعات مفتوحة حالياً' : 'لا توجد نزاعات محلولة بعد';

  return (
    <div>
      <h1 className="text-2xl font-bold text-on-surface">نزاعات الضمان</h1>
      <p className="mt-2 text-sm text-slate-500">
        مراجعة النزاعات المفتوحة واتخاذ قرار: استرداد للعميل أو تحرير للمستقل
      </p>

      <div className="mt-6 flex gap-2 border-b">
        <button
          type="button"
          onClick={() => setTab('open')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'open'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          }`}
        >
          مفتوحة
        </button>
        <button
          type="button"
          onClick={() => setTab('resolved')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'resolved'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-on-surface'
          }`}
        >
          محلولة
        </button>
      </div>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border bg-white" />
          ))}
        </div>
      ) : null}

      {!isLoading && disputes.length === 0 ? (
        <div className="mt-8">
          <AdminEmptyState message={emptyMessage} />
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        {disputes.map((dispute) => (
          <DisputeCard
            key={dispute.id}
            dispute={dispute}
            tab={tab}
            onResolve={tab === 'open' ? setResolving : undefined}
          />
        ))}
      </div>

      {resolving ? (
        <ResolveDisputeModal
          dispute={resolving}
          isLoading={isActing}
          onClose={() => setResolving(null)}
          onResolve={handleResolve}
        />
      ) : null}
    </div>
  );
}
