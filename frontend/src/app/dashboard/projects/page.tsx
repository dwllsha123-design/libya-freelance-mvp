'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ProjectStatusActions } from '@/components/projects/project-status-actions';
import { useAuth } from '@/contexts/auth-context';
import { useProjectsApi } from '@/hooks/use-projects';
import type { ManageProject, ProjectStatus } from '@/lib/schemas/project';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'مسودة',
  OPEN: 'مفتوح',
  IN_PROGRESS: 'قيد التنفيذ',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي',
  CLOSED: 'مغلق',
};

const TABS: { key: ProjectStatus | 'ALL'; label: string }[] = [
  { key: 'ALL', label: 'الكل' },
  { key: 'DRAFT', label: 'مسودات' },
  { key: 'OPEN', label: 'مفتوحة' },
  { key: 'CLOSED', label: 'مغلقة' },
  { key: 'CANCELLED', label: 'ملغاة' },
  { key: 'IN_PROGRESS', label: 'قيد التنفيذ' },
  { key: 'COMPLETED', label: 'مكتملة' },
];

export default function ClientProjectsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useProjectsApi();
  const [projects, setProjects] = useState<ManageProject[]>([]);
  const [filter, setFilter] = useState<ProjectStatus | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'CLIENT') return;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.listMine(filter === 'ALL' ? undefined : filter);
        if (!cancelled) setProjects(data);
      } catch {
        if (!cancelled) setError('فشل تحميل المشاريع');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, filter, api]);

  async function reloadProjects() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.listMine(filter === 'ALL' ? undefined : filter);
      setProjects(data);
    } catch {
      setError('فشل تحميل المشاريع');
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
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="p-8 text-center">
        <p>هذه الصفحة للعملاء فقط</p>
        <Link href="/dashboard" className="text-primary">
          العودة
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-on-surface">مشاريعي</h1>
        <Link
          href="/dashboard/projects/new"
          className="rounded-lg bg-primary px-5 py-2.5 font-semibold text-white"
        >
          انشر مشروع
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
          <p className="text-slate-500">لا توجد مشاريع في هذا القسم</p>
          {filter === 'ALL' || filter === 'DRAFT' ? (
            <Link
              href="/dashboard/projects/new"
              className="mt-4 inline-block text-primary hover:underline"
            >
              أنشئ مشروعك الأول
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
                  أنشئ {new Date(project.createdAt).toLocaleDateString('ar-LY')}
                  {project.publishedAt
                    ? ` · نُشر ${new Date(project.publishedAt).toLocaleDateString('ar-LY')}`
                    : ''}
                </p>
                {project.proposalCount > 0 ? (
                  <p className="mt-1 text-xs text-primary">
                    {project.proposalCount} عروض مستلمة
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
                      تعديل
                    </Link>
                  )}
                  {project.status === 'DRAFT' && (
                    <Link
                      href={`/dashboard/projects/${project.id}/edit`}
                      className="rounded-lg bg-primary px-4 py-2 text-sm text-white"
                    >
                      نشر
                    </Link>
                  )}
                  {project.status === 'OPEN' ? (
                    <>
                      <Link
                        href={`/projects/${project.slug}`}
                        className="rounded-lg border px-4 py-2 text-sm text-primary"
                      >
                        عرض
                      </Link>
                      {project.proposalCount > 0 ? (
                        <Link
                          href={`/dashboard/projects/${project.id}/proposals`}
                          className="rounded-lg border px-4 py-2 text-sm"
                        >
                          عرض العروض ({project.proposalCount})
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
