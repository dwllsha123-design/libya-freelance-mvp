'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ProposalFormModal } from '@/components/proposals/proposal-form-modal';
import { BackLink } from '@/components/ui/back-link';
import { Pill } from '@/components/ui/motion';
import { useAuth } from '@/contexts/auth-context';
import { useNuqatiApi, useNuqatiBalance } from '@/hooks/use-nuqati';
import { useProjectsApi } from '@/hooks/use-projects';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { buildAuthHref } from '@/lib/auth-redirect';
import {
  getLocalizedCategoryName,
  getLocalizedCityName,
} from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { ProjectListItem } from '@/lib/schemas/project';

const DEFAULT_SUBMIT_COST = 10;

export default function ProjectDetailClient({ slug }: { slug: string }) {
  const t = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { user } = useAuth();
  const api = useProjectsApi();
  const proposalsApi = useProposalsApi();
  const nuqatiApi = useNuqatiApi();
  const { balance, reload: reloadBalance } = useNuqatiBalance();
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [myProposal, setMyProposal] = useState<FreelancerProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitCost, setSubmitCost] = useState(DEFAULT_SUBMIT_COST);

  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const EXPERIENCE_LABELS: Record<string, string> = useMemo(
    () => ({
      ENTRY: t('experienceEntry'),
      INTERMEDIATE: t('experienceIntermediate'),
      EXPERT: t('experienceExpert'),
    }),
    [t],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await api.getBySlug(slug);
        if (cancelled) return;
        setProject(data);

        if (user?.role === 'FREELANCER' && data.id) {
          try {
            const mine = await proposalsApi.getMyForProject(data.id);
            if (!cancelled) setMyProposal(mine);
          } catch {
            /* no proposal yet */
          }

          try {
            const dash = await nuqatiApi.getDashboard();
            if (!cancelled && typeof dash.proposalCost === 'number') {
              setSubmitCost(dash.proposalCost);
            }
          } catch {
            /* keep default cost */
          }
        }
      } catch {
        if (!cancelled) setError(t('notAvailable'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, slug, user, proposalsApi, nuqatiApi, t]);

  async function handleSubmit(values: {
    coverLetter: string;
    proposedPrice: number;
    estimatedDurationDays: number;
    boostPoints: number;
  }) {
    if (!project?.id) return;
    setIsSubmitting(true);
    try {
      const created = await proposalsApi.submit(project.id, {
        coverLetter: values.coverLetter,
        proposedPrice: values.proposedPrice,
        estimatedDurationDays: values.estimatedDurationDays,
        boostPoints: values.boostPoints,
      });
      setMyProposal(created);
      setModalOpen(false);
      void reloadBalance();
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="page-gutter min-h-[50vh] py-8 text-center text-ink-soft">
        {tCommon('loadingPage')}
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="page-gutter min-h-[50vh] py-8 text-center text-error">{error}</div>
    );
  }

  const isOwner =
    user?.role === 'CLIENT' &&
    project.client?.username === user.profile?.username;

  const canApply = user?.role === 'FREELANCER' && !myProposal && !isOwner;
  const showStickyApply = canApply;

  const budgetLabel = `${project.budgetMin.toLocaleString(numberLocale)}–${project.budgetMax.toLocaleString(numberLocale)} ${tCommon('currencyCode')}`;

  const meta = [
    {
      l: t('budgetLabel'),
      v: budgetLabel,
      icon: '◈',
    },
    {
      l: t('experienceLabel'),
      v: EXPERIENCE_LABELS[project.experienceLevel] ?? project.experienceLevel,
      icon: '▲',
    },
    {
      l: t('workModeLabel'),
      v:
        project.workMode === 'REMOTE'
          ? t('workModeRemote')
          : project.city
            ? getLocalizedCityName(project.city, locale)
            : '—',
      icon: '◷',
    },
    {
      l: t('proposalsLabel'),
      v: String(project.proposalCount ?? 0),
      icon: '◱',
    },
  ];

  return (
    <div className="min-h-screen pb-28">
      <div className="page-gutter mx-auto max-w-4xl py-8 sm:py-10">
        <BackLink href="/projects">{t('browseTitle')}</BackLink>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Pill tone="palm">{getLocalizedCategoryName(project.category, locale)}</Pill>
          <span className="inline-flex items-center gap-1 rounded-full bg-palm/10 px-3 py-1 text-xs font-medium text-palm-deep">
            ● {t('statusOpen')}
          </span>
        </div>

        <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-ink md:text-4xl">
          {project.title}
        </h1>
        {project.publishedAt ? (
          <p className="mt-2 text-sm text-ink-soft">
            {t('publishedAgo', {
              date: new Date(project.publishedAt).toLocaleDateString(numberLocale),
            })}
          </p>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-4">
          {meta.map((m) => (
            <div key={m.l} className="bg-cream px-4 py-5 sm:px-5">
              <div className="text-lg text-ember">{m.icon}</div>
              <div className="mt-2 font-display text-sm font-semibold text-ink sm:text-base">
                {m.v}
              </div>
              <div className="text-xs text-ink-soft">{m.l}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 md:grid-cols-[1fr_260px]">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              {t('offerDetailsCard')}
            </h2>
            <p className="mt-3 whitespace-pre-wrap leading-loose text-ink-soft">
              {project.description}
            </p>

            <h2 className="mt-8 font-display text-xl font-semibold text-ink">
              {t('requiredSkills')}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.skills.map((s) => (
                <Pill key={s.slug} tone="sand">
                  {s.name}
                </Pill>
              ))}
            </div>

            {project.client ? (
              <div className="mt-8 rounded-2xl border border-line bg-cream p-5">
                <h2 className="font-display text-lg font-semibold text-ink">
                  {t('aboutClient')}
                </h2>
                <Link
                  href={`/clients/${project.client.username}`}
                  className="mt-3 inline-block font-medium text-ember hover:underline"
                >
                  {project.client.displayName}
                </Link>
              </div>
            ) : null}

            {!showStickyApply ? (
              <div className="mt-6 rounded-2xl border border-dashed border-line bg-cream p-6 text-center">
                {!user ? (
                  <div className="space-y-4">
                    <p className="text-ink-soft">{t('guestReadOnly')}</p>
                    <div className="flex flex-wrap justify-center gap-3">
                      <Link
                        href={buildAuthHref('/register', {
                          next: pathname,
                          role: 'FREELANCER',
                        })}
                        className="inline-block rounded-full bg-ember px-6 py-3 font-semibold text-white hover:bg-ember-deep"
                      >
                        {t('guestRegisterCta')}
                      </Link>
                      <Link
                        href={buildAuthHref('/login', { next: pathname })}
                        className="inline-block rounded-full border border-line bg-cream px-6 py-3 font-semibold text-ink hover:border-ink"
                      >
                        {tDashboard('login')}
                      </Link>
                    </div>
                  </div>
                ) : isOwner ? (
                  <p className="text-ink-soft">{t('ownerCannotPropose')}</p>
                ) : user.role === 'FREELANCER' && myProposal ? (
                  <>
                    <p className="font-semibold text-ember">{t('proposalSubmitted')}</p>
                    <Link
                      href="/dashboard/proposals"
                      className="mt-3 inline-block text-sm text-ink underline"
                    >
                      {t('viewMyProposal')}
                    </Link>
                  </>
                ) : (
                  <p className="text-ink-soft">{t('freelancersOnlySubmit')}</p>
                )}
              </div>
            ) : null}
          </div>

          <aside className="h-fit space-y-4 md:sticky md:top-24">
            <div className="rounded-2xl border border-line bg-cream p-6">
              <div className="text-sm text-ink-soft">{t('applyCostLabel')}</div>
              <div className="mt-1 font-display text-3xl font-bold text-ink">
                <span className="font-mono">{submitCost}</span>{' '}
                <span className="text-base font-medium text-ink-soft">
                  {t('unitsShort')}
                </span>
              </div>
              {balance != null ? (
                <p className="mt-1 text-xs text-ink-soft">
                  {t('balanceAvailable', { balance })}
                </p>
              ) : null}
              {canApply ? (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-5 block w-full rounded-xl bg-ember py-3 text-center text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-ember-deep"
                >
                  {t('applyNow')}
                </button>
              ) : (
                <Link
                  href={buildAuthHref('/login', { next: pathname })}
                  className="mt-5 block w-full rounded-xl bg-ember py-3 text-center text-sm font-semibold text-white transition-all hover:bg-ember-deep"
                >
                  {t('applyNow')}
                </Link>
              )}
            </div>
          </aside>
        </div>
      </div>

      {showStickyApply ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-cream/95 backdrop-blur md:hidden">
          <div className="page-gutter flex items-center justify-between gap-3 py-3">
            <div className="text-sm text-ink-soft">
              {t('applyNowWithCost', { cost: submitCost })}
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-ember px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-ember-deep"
            >
              {t('applyNow')}
            </button>
          </div>
        </div>
      ) : null}

      <ProposalFormModal
        project={project}
        open={modalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        submitCost={submitCost}
        balance={balance}
      />
    </div>
  );
}
