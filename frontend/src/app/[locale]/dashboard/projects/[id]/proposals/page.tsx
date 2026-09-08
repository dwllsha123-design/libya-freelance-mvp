'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { BackLink } from '@/components/ui/back-link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ConfirmDialog } from '@/components/projects/confirm-dialog';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi } from '@/hooks/use-messaging';
import { useProposalsApi, type ClientProposal } from '@/hooks/use-proposals';
import { useAgreementsApi } from '@/hooks/use-agreements';
import { ApiError } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import type { AppLocale } from '@/i18n/routing';
import { FreelancerBadgeChip } from '@/components/badges/freelancer-badge-chip';

export default function ProjectProposalsPage() {
  const t = useTranslations('projects');
  const tProposals = useTranslations('proposals');
  const tAgreements = useTranslations('agreements');
  const tFreelancers = useTranslations('freelancers');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useProposalsApi();
  const agreementsApi = useAgreementsApi();
  const messagingApi = useMessagingApi();
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'reject' | null>(null);
  const [isActing, setIsActing] = useState(false);
  const [selectingId, setSelectingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !user || user.role !== 'CLIENT') return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.listForProject(params.id);
        if (!cancelled) setProposals(data);
      } catch {
        if (!cancelled) setError(t('loadProposalsFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, params.id, api, t]);

  async function reload() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listForProject(params.id);
      setProposals(data);
    } catch {
      setError(t('loadProposalsFailed'));
    } finally {
      setIsLoading(false);
    }
  }

  async function executeReject() {
    if (!actionId) return;
    setIsActing(true);
    try {
      await api.reject(actionId);
      setActionId(null);
      setActionType(null);
      await reload();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tProposals('actionFailed'));
    } finally {
      setIsActing(false);
    }
  }

  async function executeSelectAgreement(proposalId: string) {
    setSelectingId(proposalId);
    setError(null);
    try {
      const agreement = await agreementsApi.create(proposalId);
      router.push(`/dashboard/agreements/${agreement.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.details as { agreementId?: string; code?: string } | undefined;
        if (body?.agreementId) {
          router.push(`/dashboard/agreements/${body.agreementId}`);
          return;
        }
        setError(err.message);
      } else {
        setError(tAgreements('actionFailed'));
      }
    } finally {
      setSelectingId(null);
    }
  }

  async function openChat(proposalId: string) {
    setMessagingId(proposalId);
    try {
      const conv = await messagingApi.openForProposal(proposalId);
      router.push(`/messages/${conv.conversationId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tProposals('openChatFailed'));
    } finally {
      setMessagingId(null);
    }
  }

  if (authLoading || (user?.role === 'CLIENT' && isLoading)) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user || user.role !== 'CLIENT') {
    return <div className="p-8 text-center">{tDashboard('unauthorized')}</div>;
  }

  return (
    <div className="page-gutter mx-auto w-full min-w-0 max-w-4xl overflow-x-hidden py-8 sm:py-10">
      <BackLink href="/dashboard/projects">{tDashboard('myProjects')}</BackLink>
      <h1 className="mt-4 text-2xl font-bold text-on-surface sm:text-3xl">{t('projectProposals')}</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        {tAgreements('clientPrompt')}
      </p>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      {!error && proposals.length === 0 ? (
        <p className="mt-8 text-slate-500">{t('noProposalsYet')}</p>
      ) : null}

      <div className="mt-8 grid gap-4">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="min-w-0 overflow-hidden rounded-xl border bg-white p-4 sm:p-6">
            <div className="flex gap-4">
              {proposal.freelancer?.profilePhoto ? (
                <Image
                  src={proposal.freelancer.profilePhoto}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm">
                  {proposal.freelancer?.displayName?.[0] ?? '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words font-bold [overflow-wrap:anywhere]">
                  {proposal.freelancer?.displayName}
                </p>
                <p className="break-words text-sm text-slate-500 [overflow-wrap:anywhere]">
                  {proposal.freelancer?.professionalTitle ?? tFreelancers('defaultTitle')}
                </p>
                <div className="mt-1">
                  <FreelancerBadgeChip
                    level={proposal.freelancer?.performanceLevel}
                    verifiedTalent={Boolean(proposal.freelancer?.isVerifiedTalent)}
                    compact
                  />
                </div>
                {proposal.freelancer?.rating ? (
                  <p className="text-xs text-amber-600">
                    ★ {proposal.freelancer.rating.toFixed(1)}
                  </p>
                ) : null}
              </div>
            </div>

            <p className="mt-4 break-words whitespace-pre-wrap text-sm text-slate-700 [overflow-wrap:anywhere]">
              {proposal.coverLetter}
            </p>

            <p className="mt-3 text-sm font-medium text-primary">
              {formatCurrency(proposal.proposedPrice, 'LYD', locale)} ·{' '}
              {t('days', { count: proposal.estimatedDurationDays })}
              {proposal.boostPoints && proposal.boostPoints > 0 ? (
                <span className="ms-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {tProposals('boostBadge', { count: proposal.boostPoints })}
                </span>
              ) : null}
            </p>

            {proposal.freelancer?.portfolio?.count ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span>{t('portfolioWorks', { count: proposal.freelancer.portfolio.count })}</span>
                <div className="flex gap-1">
                  {proposal.freelancer.portfolio.recentThumbnails.map((thumb, i) => (
                    <Image
                      key={`${proposal.id}-thumb-${i}`}
                      src={thumb}
                      alt=""
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {proposal.freelancer ? (
                <Link
                  href={`/freelancers/${proposal.freelancer.username}`}
                  className="rounded-lg border px-4 py-2 text-sm"
                >
                  {t('viewProfile')}
                </Link>
              ) : null}
              {proposal.status === 'PENDING' || proposal.status === 'ACCEPTED' ? (
                <button
                  type="button"
                  disabled={messagingId === proposal.id}
                  onClick={() => void openChat(proposal.id)}
                  className="rounded-lg border px-4 py-2 text-sm text-primary"
                >
                  {messagingId === proposal.id
                    ? tProposals('opening')
                    : t('messageFreelancer')}
                </button>
              ) : null}
              {proposal.status === 'PENDING' ? (
                <>
                  <button
                    type="button"
                    disabled={selectingId === proposal.id}
                    onClick={() => void executeSelectAgreement(proposal.id)}
                    className="rounded-lg bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
                  >
                    {selectingId === proposal.id
                      ? tAgreements('creating')
                      : tAgreements('selectFreelancer')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActionId(proposal.id);
                      setActionType('reject');
                    }}
                    className="rounded-lg border px-4 py-2 text-sm text-red-600"
                  >
                    {t('rejectProposal')}
                  </button>
                </>
              ) : (
                <span className="text-sm text-slate-500">{proposal.status}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={actionType === 'reject'}
        title={t('rejectProposal')}
        message={t('rejectProposalConfirm')}
        confirmLabel={t('reject')}
        variant="danger"
        isLoading={isActing}
        onConfirm={() => void executeReject()}
        onCancel={() => {
          setActionId(null);
          setActionType(null);
        }}
      />
    </div>
  );
}
