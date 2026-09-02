'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi } from '@/hooks/use-messaging';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { FreelancerProposalCompletion } from '@/components/projects/freelancer-proposal-completion';
import { ApiError } from '@/lib/api';

export default function MyProposalsPage() {
  const t = useTranslations('proposals');
  const tProjects = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const proposalsApi = useProposalsApi();
  const messagingApi = useMessagingApi();
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<FreelancerProposal[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const STATUS_LABELS: Record<string, string> = useMemo(
    () => ({
      PENDING: t('pendingShort'),
      ACCEPTED: t('accepted'),
      REJECTED: t('rejected'),
      WITHDRAWN: t('withdrawn'),
    }),
    [t],
  );

  const PROJECT_STATUS_LABELS: Record<string, string> = useMemo(
    () => ({
      IN_PROGRESS: tProjects('statusInProgress'),
      COMPLETED: tProjects('statusCompleted'),
    }),
    [tProjects],
  );

  const TABS = useMemo(
    () => [
      { key: '', label: t('tabAll') },
      { key: 'PENDING', label: t('tabPending') },
      { key: 'ACCEPTED', label: t('tabAccepted') },
      { key: 'REJECTED', label: t('tabRejected') },
      { key: 'WITHDRAWN', label: t('tabWithdrawn') },
    ],
    [t],
  );

  useEffect(() => {
    if (!user || user.role !== 'FREELANCER') return;

    let cancelled = false;

    (async () => {
      try {
        const data = await proposalsApi.listMine(filter || undefined);
        if (!cancelled) setProposals(data.items);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, filter, proposalsApi, t]);

  async function refreshProposals() {
    const data = await proposalsApi.listMine(filter || undefined);
    setProposals(data.items);
  }

  async function handleWithdraw(id: string) {
    await proposalsApi.withdraw(id);
    await refreshProposals();
  }

  async function openChat(proposal: FreelancerProposal) {
    setMessagingId(proposal.id);
    try {
      const conv = await messagingApi.openForProposal(proposal.id);
      router.push(`/messages/${conv.conversationId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('openChatFailed'));
    } finally {
      setMessagingId(null);
    }
  }

  if (authLoading || (user?.role === 'FREELANCER' && isLoading)) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user || user.role !== 'FREELANCER') {
    return (
      <div className="p-8 text-center">
        <p>{tDashboard('freelancersOnly')}</p>
        <Link href="/dashboard" className="text-primary">{tCommon('back')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">{t('myProposals')}</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key || 'all'}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-4 py-1.5 text-sm ${
              filter === tab.key ? 'bg-on-surface text-white' : 'border bg-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? <p className="mt-8 text-red-600">{error}</p> : null}

      {!isLoading && !error && proposals.length === 0 ? (
        <p className="mt-8 text-slate-500">{t('noProposalsInSection')}</p>
      ) : null}

      <div className="mt-8 grid gap-4">
        {proposals.map((proposal) => (
          <div key={proposal.id} className="rounded-xl border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link
                  href={`/projects/${proposal.project.slug}`}
                  className="text-lg font-bold text-on-surface hover:text-primary"
                >
                  {proposal.project.title}
                </Link>
                <p className="mt-1 text-sm text-slate-500">
                  {STATUS_LABELS[proposal.status]}
                  {PROJECT_STATUS_LABELS[proposal.project.status]
                    ? ` · ${PROJECT_STATUS_LABELS[proposal.project.status]}`
                    : ''}{' '}
                  · {proposal.proposedPrice}{' '}
                  {proposal.project.currency} ·{' '}
                  {tProjects('days', { count: proposal.estimatedDurationDays })}
                </p>
                <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                  {proposal.coverLetter}
                </p>
              </div>
                {(proposal.status === 'ACCEPTED' || proposal.conversationId) &&
                (proposal.status === 'PENDING' || proposal.status === 'ACCEPTED') ? (
                  <button
                    type="button"
                    disabled={messagingId === proposal.id}
                    onClick={() => void openChat(proposal)}
                    className="rounded-lg border px-4 py-2 text-sm text-primary"
                  >
                    {messagingId === proposal.id
                      ? t('opening')
                      : proposal.status === 'ACCEPTED'
                        ? t('messageClient')
                        : t('openChat')}
                  </button>
                ) : null}
                {proposal.status === 'PENDING' ? (
                <button
                  type="button"
                  onClick={() => void handleWithdraw(proposal.id)}
                  className="rounded-lg border px-4 py-2 text-sm text-red-600"
                >
                  {t('withdraw')}
                </button>
              ) : null}
            </div>
            <FreelancerProposalCompletion
              proposal={proposal}
              onUpdated={() => void refreshProposals()}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
