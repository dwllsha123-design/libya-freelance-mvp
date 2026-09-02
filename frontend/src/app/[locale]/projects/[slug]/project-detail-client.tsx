'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ProposalFormModal } from '@/components/proposals/proposal-form-modal';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/contexts/auth-context';
import { useProjectsApi } from '@/hooks/use-projects';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { buildAuthHref } from '@/lib/auth-redirect';
import { getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { ProjectListItem } from '@/lib/schemas/project';

export default function ProjectDetailClient({ slug }: { slug: string }) {
  const t = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const { user } = useAuth();
  const api = useProjectsApi();
  const proposalsApi = useProposalsApi();
  const [project, setProject] = useState<ProjectListItem | null>(null);
  const [myProposal, setMyProposal] = useState<FreelancerProposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
  }, [api, slug, user, proposalsApi, t]);

  async function handleSubmit(values: {
    coverLetter: string;
    proposedPrice: number;
    estimatedDurationDays: number;
  }) {
    if (!project?.id) return;
    setIsSubmitting(true);
    try {
      const created = await proposalsApi.submit(project.id, values);
      setMyProposal(created);
      setModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (error || !project) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  const isOwner =
    user?.role === 'CLIENT' &&
    project.client?.username === user.profile?.username;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackLink href="/projects">{t('browseTitle')}</BackLink>

      <article className="mt-6">
        <h1 className="text-3xl font-bold text-on-surface">{project.title}</h1>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            💰 {project.budgetMin}–{project.budgetMax} {project.currency}
          </span>
          <span>
            {project.budgetType === 'FIXED' ? t('budgetTypeFixed') : t('budgetTypeHourly')}
          </span>
          <span>{EXPERIENCE_LABELS[project.experienceLevel]}</span>
          <span>
            {project.workMode === 'REMOTE'
              ? t('workModeRemote')
              : project.city
                ? getLocalizedCityName(project.city, locale)
                : '—'}
          </span>
          {project.deadline ? (
            <span>📅 {new Date(project.deadline).toLocaleDateString(numberLocale)}</span>
          ) : null}
          {project.proposalCount !== undefined ? (
            <span>{t('proposalsCount', { count: project.proposalCount })}</span>
          ) : null}
        </div>

        <section className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">{t('projectDetails')}</h2>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700">
            {project.description}
          </p>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">{t('requiredSkills')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.skills.map((s) => (
              <span
                key={s.slug}
                className="rounded-full bg-surface-container-low px-3 py-1 text-sm"
              >
                {s.name}
              </span>
            ))}
          </div>
        </section>

        {project.client ? (
          <section className="mt-6 rounded-xl border bg-white p-6">
            <h2 className="text-lg font-semibold">{t('aboutClient')}</h2>
            <Link
              href={`/clients/${project.client.username}`}
              className="mt-3 inline-block font-medium text-primary"
            >
              {project.client.displayName}
            </Link>
          </section>
        ) : null}

        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
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
          ) : user.role === 'FREELANCER' ? (
            myProposal ? (
              <>
                <p className="font-semibold text-primary">{t('proposalSubmitted')}</p>
                <Link
                  href="/dashboard/proposals"
                  className="mt-3 inline-block text-sm text-on-surface underline"
                >
                  {t('viewMyProposal')}
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-primary px-8 py-3 font-semibold text-white"
              >
                {t('postProposalCta')}
              </button>
            )
          ) : (
            <p className="text-slate-600">{t('freelancersOnlySubmit')}</p>
          )}
        </div>
      </article>

      <ProposalFormModal
        project={project}
        open={modalOpen}
        isSubmitting={isSubmitting}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
