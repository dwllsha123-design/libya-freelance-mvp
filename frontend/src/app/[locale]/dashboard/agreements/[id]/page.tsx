'use client';

import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/contexts/auth-context';
import {
  useAgreementsApi,
  type AgreementChangeType,
  type AgreementTimelineEvent,
  type ProjectAgreementDetail,
} from '@/hooks/use-agreements';
import { useEscrowApi } from '@/hooks/use-escrow';
import { EscrowFundDialog } from '@/components/escrow/escrow-fund-dialog';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import type { AppLocale } from '@/i18n/routing';

export default function AgreementDetailPage() {
  const t = useTranslations('agreements');
  const tCommon = useTranslations('common');
  const tDashboard = useTranslations('dashboard');
  const locale = useLocale() as AppLocale;
  const params = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const api = useAgreementsApi();
  const escrowApi = useEscrowApi();

  const [agreement, setAgreement] = useState<ProjectAgreementDetail | null>(null);
  const [timeline, setTimeline] = useState<AgreementTimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [showChange, setShowChange] = useState(false);
  const [showFund, setShowFund] = useState(false);
  const [changeType, setChangeType] = useState<AgreementChangeType>('SCOPE');
  const [changeReason, setChangeReason] = useState('');
  const [proposedAmount, setProposedAmount] = useState('');
  const [proposedDuration, setProposedDuration] = useState('');
  const [proposedRevisions, setProposedRevisions] = useState('');

  async function reload() {
    const data = await api.get(params.id);
    setAgreement(data);
    const history = await api.history(params.id);
    setTimeline(history.timeline);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      try {
        await reload();
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, params.id]);

  async function handleAccept() {
    if (!checked || !agreement) return;
    setIsActing(true);
    setError(null);
    try {
      const updated = await api.accept(agreement.id);
      setAgreement(updated);
      setChecked(false);
      const history = await api.history(agreement.id);
      setTimeline(history.timeline);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('actionFailed'));
    } finally {
      setIsActing(false);
    }
  }

  async function handleChangeRequest() {
    if (!agreement || changeReason.trim().length < 5) return;
    setIsActing(true);
    setError(null);
    try {
      const body: Parameters<typeof api.changeRequest>[1] = {
        changeType,
        reason: changeReason.trim(),
      };
      if (changeType === 'PRICE' && proposedAmount) {
        body.proposedGrossAmount = Number(proposedAmount);
      }
      if (changeType === 'DEADLINE' && proposedDuration) {
        body.proposedDurationDays = Number(proposedDuration);
      }
      if (changeType === 'REVISIONS' && proposedRevisions) {
        body.proposedRevisionCount = Number(proposedRevisions);
      }
      const updated = await api.changeRequest(agreement.id, body);
      setAgreement(updated);
      setShowChange(false);
      setChangeReason('');
      setChecked(false);
      const history = await api.history(agreement.id);
      setTimeline(history.timeline);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('actionFailed'));
    } finally {
      setIsActing(false);
    }
  }

  async function handleFundAndStart() {
    if (!agreement) return;
    setIsActing(true);
    setError(null);
    try {
      await escrowApi.fundAndAccept(agreement.proposalId);
      setShowFund(false);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('actionFailed'));
    } finally {
      setIsActing(false);
    }
  }

  if (authLoading || (user && isLoading)) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">{tDashboard('unauthorized')}</div>;
  }

  if (!agreement || !agreement.currentVersion) {
    return (
      <div className="page-gutter mx-auto max-w-3xl py-10">
        <p className="text-red-600">{error ?? t('loadFailed')}</p>
      </div>
    );
  }

  const v = agreement.currentVersion;
  const isClient = agreement.viewerRole === 'CLIENT';
  const showFreelancerNet = agreement.viewerRole === 'FREELANCER' || isClient;

  return (
    <div className="page-gutter mx-auto w-full min-w-0 max-w-3xl overflow-x-hidden py-8 sm:py-10">
      <BackLink href="/dashboard/agreements">{t('listTitle')}</BackLink>
      <h1 className="mt-4 text-2xl font-bold text-on-surface sm:text-3xl">
        {t('reviewTitle')}
      </h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {isClient ? t('clientPrompt') : t('freelancerPrompt')}
      </p>

      <div className="mt-4 inline-flex rounded-full bg-surface-container px-3 py-1 text-xs font-medium">
        {t('status')}: {t(`statuses.${agreement.status}`)} ·{' '}
        {t('version', { number: v.versionNumber })}
      </div>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      <section className="mt-8 space-y-4 rounded-2xl border border-outline-variant/40 bg-surface p-5 sm:p-6">
        <DetailRow label={t('projectName')} value={agreement.project.title} />
        <DetailRow
          label={t('client')}
          value={agreement.client.displayName ?? agreement.client.username ?? '—'}
        />
        <DetailRow
          label={t('freelancer')}
          value={
            agreement.freelancer.displayName ??
            agreement.freelancer.username ??
            '—'
          }
        />
        <DetailBlock label={t('scope')} value={v.scope} />
        <DetailBlock label={t('deliverables')} value={v.deliverables} />
        <DetailRow
          label={t('amount')}
          value={formatCurrency(v.grossAmount, v.currency, locale)}
        />
        <DetailRow
          label={t('platformFee')}
          value={formatCurrency(v.platformFee, v.currency, locale)}
        />
        {showFreelancerNet ? (
          <DetailRow
            label={t('freelancerNet')}
            value={formatCurrency(v.freelancerNet, v.currency, locale)}
          />
        ) : null}
        <DetailRow label={t('duration')} value={t('days', { count: v.durationDays })} />
        <DetailRow
          label={t('deliveryDate')}
          value={
            v.deliveryDate
              ? new Date(v.deliveryDate).toLocaleDateString(
                  locale === 'ar' ? 'ar-LY' : 'en-LY',
                )
              : '—'
          }
        />
        <DetailRow label={t('revisions')} value={String(v.revisionCount)} />
        <DetailBlock label={t('paymentTerms')} value={v.paymentTerms} />
        <DetailBlock label={t('cancellationTerms')} value={v.cancellationTerms} />
        <DetailBlock label={t('disputeTerms')} value={v.disputeTerms} />

        {v.milestones.length > 0 ? (
          <div>
            <p className="text-sm font-semibold text-on-surface">{t('milestones')}</p>
            <ul className="mt-2 space-y-2">
              {v.milestones.map((m) => (
                <li
                  key={m.id}
                  className="rounded-lg bg-surface-container/60 px-3 py-2 text-sm"
                >
                  <span className="font-medium">{m.title}</span>
                  <span className="ms-2 text-on-surface-variant">
                    {formatCurrency(m.amount, v.currency, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {agreement.status === 'APPROVED' || agreement.status === 'PAYMENT_PENDING' ? (
        <p className="mt-4 text-sm text-emerald-700">{t('approvedHint')}</p>
      ) : null}

      {agreement.canAccept ? (
        <div className="mt-6 space-y-4 rounded-2xl border border-outline-variant/40 p-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
            />
            <span>{t('checkbox')}</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!checked || isActing}
              onClick={() => void handleAccept()}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {isActing ? t('accepting') : isClient ? t('acceptCta') : t('acceptShort')}
            </button>
            {agreement.canRequestChange ? (
              <button
                type="button"
                onClick={() => setShowChange(true)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {t('requestChange')}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {agreement.iAccepted && agreement.status === 'PENDING_APPROVAL' ? (
            <p className="text-sm text-on-surface-variant">{t('waitingOtherParty')}</p>
          ) : null}
          {agreement.canRequestChange ? (
            <button
              type="button"
              onClick={() => setShowChange(true)}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              {t('requestChange')}
            </button>
          ) : null}
          {isClient && agreement.canFund ? (
            <button
              type="button"
              onClick={() => setShowFund(true)}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
            >
              {t('fundCta')}
            </button>
          ) : null}
        </div>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-bold">{t('timeline')}</h2>
        <ol className="mt-4 space-y-3 border-s border-outline-variant/50 ps-4">
          {timeline.map((event) => (
            <li key={event.id} className="relative text-sm">
              <span className="absolute -start-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
              <p className="font-medium">
                {t(`timelineActions.${event.action}` as 'timelineActions.AGREEMENT_CREATED')}
              </p>
              <p className="text-xs text-on-surface-variant">
                {new Date(event.createdAt).toLocaleString(
                  locale === 'ar' ? 'ar-LY' : 'en-LY',
                )}
                {event.actor?.displayName ? ` · ${event.actor.displayName}` : ''}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {showChange ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-lg">
            <h3 className="text-lg font-bold">{t('requestChange')}</h3>
            <label className="mt-4 block text-sm">
              {t('changeType')}
              <select
                className="mt-1 w-full rounded-lg border px-3 py-2"
                value={changeType}
                onChange={(e) => setChangeType(e.target.value as AgreementChangeType)}
              >
                {(
                  [
                    'PRICE',
                    'DEADLINE',
                    'SCOPE',
                    'DELIVERABLES',
                    'REVISIONS',
                    'OTHER',
                  ] as AgreementChangeType[]
                ).map((type) => (
                  <option key={type} value={type}>
                    {t(`changeTypes.${type}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-sm">
              {t('changeReason')}
              <textarea
                className="mt-1 w-full rounded-lg border px-3 py-2"
                rows={3}
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </label>
            {changeType === 'PRICE' ? (
              <label className="mt-3 block text-sm">
                {t('proposedAmount')}
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={proposedAmount}
                  onChange={(e) => setProposedAmount(e.target.value)}
                />
              </label>
            ) : null}
            {changeType === 'DEADLINE' ? (
              <label className="mt-3 block text-sm">
                {t('proposedDuration')}
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={proposedDuration}
                  onChange={(e) => setProposedDuration(e.target.value)}
                />
              </label>
            ) : null}
            {changeType === 'REVISIONS' ? (
              <label className="mt-3 block text-sm">
                {t('proposedRevisions')}
                <input
                  type="number"
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                  value={proposedRevisions}
                  onChange={(e) => setProposedRevisions(e.target.value)}
                />
              </label>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border px-4 py-2 text-sm"
                onClick={() => setShowChange(false)}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                disabled={isActing || changeReason.trim().length < 5}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void handleChangeRequest()}
              >
                {t('submitChange')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <EscrowFundDialog
        open={showFund}
        proposedPrice={v.grossAmount}
        isLoading={isActing}
        onConfirm={() => void handleFundAndStart()}
        onCancel={() => setShowFund(false)}
      />

      <p className="mt-8 text-center text-sm">
        <Link href={`/projects/${agreement.project.slug}`} className="text-primary underline">
          {agreement.project.title}
        </Link>
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
      <dt className="text-sm text-on-surface-variant">{label}</dt>
      <dd className="text-sm font-medium text-on-surface [overflow-wrap:anywhere]">{value}</dd>
    </div>
  );
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-on-surface-variant">{label}</p>
      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-on-surface [overflow-wrap:anywhere]">
        {value}
      </p>
    </div>
  );
}
