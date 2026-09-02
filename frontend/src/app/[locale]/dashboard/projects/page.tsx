'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ProjectStatusActions } from '@/components/projects/project-status-actions';
import { useAuth } from '@/contexts/auth-context';
import { useProjectsApi } from '@/hooks/use-projects';
import type { ManageProject, ProjectStatus } from '@/lib/schemas/project';
import type { AppLocale } from '@/i18n/routing';

export default function ClientProjectsPage() {
  const t = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useProjectsApi();
  const [projects, setProjects] = useState<ManageProject[]>([]);
  const [filter, setFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const STATUS_LABELS: Record<ProjectStatus, string> = useMemo(
    () => ({
      DRAFT: t('statusDraft'),
      OPEN: t('statusOpen'),
      IN_PROGRESS: t('statusInProgress'),
      COMPLETED: t('statusCompleted'),
      CANCELLED: t('statusCancelled'),
      CLOSED: t('statusClosed'),
    }),
    [t],
  );

  const TABS: { key: ProjectStatus | 'ALL'; label: string }[] = useMemo(
    () => [
      { key: 'ALL', label: t('tabAll') },
      { key: 'DRAFT', label: t('tabDrafts') },
      { key: 'OPEN', label: t('tabOpen') },
      { key: 'CLOSED', label: t('tabClosed') },
      { key: 'CANCELLED', label: t('tabCancelled') },
      { key: 'IN_PROGRESS', label: t('tabInProgress') },
      { key: 'COMPLETED', label: t('tabCompleted') },
    ],
    [t],
  );

  useEffect(() => {
    if (!user || user.role !== 'CLIENT') return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.listMine(filter === 'ALL' ? undefined : filter);
        if (!cancelled) setProjects(data);
      } catch {
        if (!cancelled) setError(tDashboard('loadProjectsFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, filter, api, tDashboard]);

  async function reloadProjects() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listMine(filter === 'ALL' ? undefined : filter);
      setProjects(data);
    } catch {
      setError(tDashboard('loadProjectsFailed'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClose(id: string) {
    await api.close(id);
    await reloadProjects();
  }

  async function handleCancel(id: string) {
    await api.cancel(id);
    await reloadProjects();
  }

  async function handleDelete(id: string) {
    await api.delete(id);
    await reloadProjects();
  }

  if (authLoading || (user?.role === 'CLIENT' && isLoading)) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="p-8 text-center">
        <p>{tDashboard('clientsOnly')}</p>
        <Link href="/dashboard" className="text-primary">
          {tCommon('back')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-on-surface">{tDashboard('myProjects')}</h1>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white"
        >
          {tDashboard('postProject')}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
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

      {!isLoading && !error && projects.length === 0 ? (
        <div className="mt-8 rounded-xl border bg-white p-8 text-center">
          <p className="text-slate-500">{tDashboard('noProjectsInSection')}</p>
          {filter === 'ALL' || filter === 'DRAFT' ? (
            <Link
              href="/dashboard/projects/new"
              className="mt-4 inline-block text-primary hover:underline"
            >
              {tDashboard('createFirstProject')}
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4">
        {projects.map((project) => (
          <div key={project.id} className="rounded-xl border bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold">{project.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {STATUS_LABELS[project.status]} · {project.budgetMin}–
                  {project.budgetMax} {project.currency}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {tDashboard('createdAt', {
                    date: new Date(project.createdAt).toLocaleDateString(numberLocale),
                  })}
                  {project.publishedAt
                    ? ` · ${tDashboard('publishedAt', {
                        date: new Date(project.publishedAt).toLocaleDateString(numberLocale),
                      })}`
                    : ''}
                </p>
                {project.proposalCount > 0 ? (
                  <p className="mt-1 text-xs text-primary">
                    {tDashboard('proposalsReceivedCount', { count: project.proposalCount })}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex flex-wrap gap-2">
                  {(project.status === 'DRAFT' || project.status === 'OPEN') && (
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="rounded-lg border px-4 py-2 text-sm"
                    >
                      {t('edit')}
                    </Link>
                  )}
                  {project.status === 'DRAFT' && (
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
                    >
                      {t('publish')}
                    </Link>
                  )}
                  {project.status === 'OPEN' ? (
                    <>
                      <Link
                        href={`/projects/${project.slug}`}
                        className="rounded-lg border px-4 py-2 text-sm text-primary"
                      >
                        {t('view')}
                      </Link>
                      {project.proposalCount > 0 ? (
                        <Link
                          href={`/dashboard/projects/${project.id}/proposals`}
                          className="rounded-lg border px-4 py-2 text-sm"
                        >
                          {t('viewProposalsCount', { count: project.proposalCount })}
                        </Link>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <ProjectStatusActions
                  project={project}
                  onClose={handleClose}
                  onCancel={handleCancel}
                  onDelete={async (id) => {
                    await handleDelete(id);
                    router.refresh();
                  }}
                  onUpdated={() => void reloadProjects()}
                  compact
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
