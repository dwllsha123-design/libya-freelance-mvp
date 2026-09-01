'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useMessagingApi } from '@/hooks/use-messaging';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { FreelancerProposalCompletion } from '@/components/projects/freelancer-proposal-completion';
import { ApiError } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'معلّق',
  ACCEPTED: 'مقبول',
  REJECTED: 'مرفوض',
  WITHDRAWN: 'مسحوب',
};

const PROJECT_STATUS_LABELS: Record<string, string> = {
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
};

const TABS = [
  { key: '', label: 'الكل' },
  { key: 'PENDING', label: 'معلّقة' },
  { key: 'ACCEPTED', label: 'مقبولة' },
  { key: 'REJECTED', label: 'مرفوضة' },
  { key: 'WITHDRAWN', label: 'مسحوبة' },
];

export default function MyProposalsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const proposalsApi = useProposalsApi();
  const messagingApi = useMessagingApi();
  const [messagingId, setMessagingId] = useState<string | null>(null);
  const [proposals, setProposals] = useState<FreelancerProposal[]>([]);
  const [filter, setFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'FREELANCER') return;

    let cancelled = false;

    (async () => {
      try {
        const data = await proposalsApi.listMine(filter || undefined);
        if (!cancelled) setProposals(data.items);
      } catch {
        if (!cancelled) setError('فشل تحميل العروض');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, filter, proposalsApi]);

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
      setError(err instanceof ApiError ? err.message : 'فشل فتح المحادثة');
    } finally {
      setMessagingId(null);
    }
  }

  if (authLoading || (user?.role === 'FREELANCER' && isLoading)) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user || user.role !== 'FREELANCER') {
    return (
      <div className="p-8 text-center">
        <p>هذه الصفحة للمستقلين فقط</p>
        <Link href="/dashboard" className="text-primary">العودة</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">عروضي</h1>

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
        <p className="mt-8 text-slate-500">لا توجد عروض في هذا القسم</p>
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
                  {proposal.project.currency} · {proposal.estimatedDurationDays} يوم
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
                      ? 'جاري الفتح...'
                      : proposal.status === 'ACCEPTED'
                        ? 'مراسلة العميل'
                        : 'فتح المحادثة'}
                  </button>
                ) : null}
                {proposal.status === 'PENDING' ? (
                <button
                  type="button"
                  onClick={() => void handleWithdraw(proposal.id)}
                  className="rounded-lg border px-4 py-2 text-sm text-red-600"
                >
                  سحب العرض
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
