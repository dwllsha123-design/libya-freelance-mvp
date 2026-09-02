'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ProposalFormModal } from '@/components/proposals/proposal-form-modal';
import { BackLink } from '@/components/ui/back-link';
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
      <div className="min-h-[50vh] bg-[#f3f4f5] p-8 text-center text-slate-500">
        {tCommon('loadingPage')}
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-[50vh] bg-[#f3f4f5] p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  const isOwner =
    user?.role === 'CLIENT' &&
    project.client?.username === user.profile?.username;

  const canApply =
    user?.role === 'FREELANCER' && !myProposal && !isOwner;

  const showStickyApply = canApply;

  return (
    <div className="min-h-screen bg-[#f3f4f5] pb-28">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <BackLink href="/projects">{t('browseTitle')}</BackLink>

        <article className="mt-6">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              {getLocalizedCategoryName(project.category, locale)}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-on-surface sm:text-3xl">
              {project.title}
            </h1>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-[#f3f4f5] px-3 py-1.5 text-sm font-medium text-on-surface">
                {project.budgetMin.toLocaleString(numberLocale)}–
                {project.budgetMax.toLocaleString(numberLocale)} د.ل
              </span>
              <span className="rounded-full bg-[#f3f4f5] px-3 py-1.5 text-sm text-slate-700">
                {project.budgetType === 'FIXED'
                  ? t('budgetTypeFixed')
                  : t('budgetTypeHourly')}
              </span>
              <span className="rounded-full bg-[#f3f4f5] px-3 py-1.5 text-sm text-slate-700">
                {EXPERIENCE_LABELS[project.experienceLevel]}
              </span>
              <span className="rounded-full bg-[#f3f4f5] px-3 py-1.5 text-sm text-slate-700">
                {project.workMode === 'REMOTE'
                  ? t('workModeRemote')
                  : project.city
                    ? getLocalizedCityName(project.city, locale)
                    : '—'}
              </span>
              {project.deadline ? (
                <span className="rounded-full bg-[#f3f4f5] px-3 py-1.5 text-sm text-slate-700">
                  {new Date(project.deadline).toLocaleDateString(numberLocale)}
                </span>
              ) : null}
              {project.proposalCount !== undefined ? (
                <span className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                  {t('proposalsCount', { count: project.proposalCount })}
                </span>
              ) : null}
            </div>
          </div>

          <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-on-surface">
              {t('offerDetailsCard')}
            </h2>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700">
              {project.description}
            </p>
          </section>

          <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-bold text-on-surface">
              {t('requiredSkills')}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.skills.map((s) => (
                <span
                  key={s.slug}
                  className="rounded-full border border-slate-200 bg-[#f3f4f5] px-3 py-1 text-sm text-slate-700"
                >
                  {s.name}
                </span>
              ))}
            </div>
          </section>

          {project.client ? (
            <section className="mt-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="text-lg font-bold text-on-surface">
                {t('aboutClient')}
              </h2>
              <Link
                href={`/clients/${project.client.username}`}
                className="mt-3 inline-block font-medium text-primary hover:underline"
              >
                {project.client.displayName}
              </Link>
            </section>
          ) : null}

          {!showStickyApply ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
              {!user ? (
                <div className="space-y-4">
                  <p className="text-slate-600">{t('guestReadOnly')}</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    <Link
                      href={buildAuthHref('/register', {
                        next: pathname,
                        role: 'FREELANCER',
                      })}
                      className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white"
                    >
                      {t('guestRegisterCta')}
                    </Link>
                    <Link
                      href={buildAuthHref('/login', { next: pathname })}
                      className="inline-block rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-on-surface"
                    >
                      {tDashboard('login')}
                    </Link>
                  </div>
                </div>
              ) : isOwner ? (
                <p className="text-slate-600">{t('ownerCannotPropose')}</p>
              ) : user.role === 'FREELANCER' && myProposal ? (
                <>
                  <p className="font-semibold text-primary">
                    {t('proposalSubmitted')}
                  </p>
                  <Link
                    href="/dashboard/proposals"
                    className="mt-3 inline-block text-sm text-on-surface underline"
                  >
                    {t('viewMyProposal')}
                  </Link>
                </>
              ) : (
                <p className="text-slate-600">{t('freelancersOnlySubmit')}</p>
              )}
            </div>
          ) : null}
        </article>
      </div>

      {showStickyApply ? (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
            <div className="hidden text-sm text-slate-600 sm:block">
              {t('applyNowWithCost', { cost: submitCost })}
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="ms-auto w-full rounded-lg bg-primary px-6 py-3 text-sm font-bold text-white shadow-sm hover:bg-primary-container sm:w-auto"
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
