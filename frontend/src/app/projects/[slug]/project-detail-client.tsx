'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ProposalFormModal } from '@/components/proposals/proposal-form-modal';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/contexts/auth-context';
import { useProjectsApi } from '@/hooks/use-projects';
import { useProposalsApi, type FreelancerProposal } from '@/hooks/use-proposals';
import { buildAuthHref } from '@/lib/auth-redirect';
import type { ProjectListItem } from '@/lib/schemas/project';

const EXPERIENCE_LABELS: Record<string, string> = {
  ENTRY: 'مبتدئ',
  INTERMEDIATE: 'متوسط',
  EXPERT: 'خبير',
};

export default function ProjectDetailClient({ slug }: { slug: string }) {
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
        if (!cancelled) setError('المشروع غير موجود أو غير متاح');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [api, slug, user, proposalsApi]);

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
    return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  }

  if (error || !project) {
    return <div className="p-8 text-center text-red-600">{error}</div>;
  }

  const isOwner =
    user?.role === 'CLIENT' &&
    project.client?.username === user.profile?.username;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackLink href="/projects">تصفح المشاريع</BackLink>

      <article className="mt-6">
        <h1 className="text-3xl font-bold text-on-surface">{project.title}</h1>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
          <span>
            💰 {project.budgetMin}–{project.budgetMax} {project.currency}
          </span>
          <span>{project.budgetType === 'FIXED' ? 'سعر ثابت' : 'بالساعة'}</span>
          <span>{EXPERIENCE_LABELS[project.experienceLevel]}</span>
          <span>
            {project.workMode === 'REMOTE' ? 'عن بُعد' : project.city?.nameAr}
          </span>
          {project.deadline ? (
            <span>📅 {new Date(project.deadline).toLocaleDateString('ar-LY')}</span>
          ) : null}
          {project.proposalCount !== undefined ? (
            <span>{project.proposalCount} عروض</span>
          ) : null}
        </div>

        <section className="mt-8 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">تفاصيل المشروع</h2>
          <p className="mt-4 whitespace-pre-wrap leading-relaxed text-slate-700">
            {project.description}
          </p>
        </section>

        <section className="mt-6 rounded-xl border bg-white p-6">
          <h2 className="text-lg font-semibold">المهارات المطلوبة</h2>
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
            <h2 className="text-lg font-semibold">عن العميل</h2>
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
              <p className="text-slate-600">
                يمكنك قراءة تفاصيل المشروع بدون حساب. عند الرغبة في تقديم عرض، أنشئ حساباً
                مستقل أو سجّل دخولك.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link
                  href={buildAuthHref('/register', {
                    next: pathname,
                    role: 'FREELANCER',
                  })}
                  className="inline-block rounded-lg bg-primary px-6 py-3 font-semibold text-white"
                >
                  إنشاء حساب وتقديم عرض
                </Link>
                <Link
                  href={buildAuthHref('/login', { next: pathname })}
                  className="inline-block rounded-lg border border-slate-300 bg-white px-6 py-3 font-semibold text-on-surface"
                >
                  تسجيل الدخول
                </Link>
              </div>
            </div>
          ) : isOwner ? (
            <p className="text-slate-600">هذا مشروعك — لا يمكنك تقديم عرض عليه</p>
          ) : user.role === 'FREELANCER' ? (
            myProposal ? (
              <>
                <p className="font-semibold text-primary">تم تقديم عرضك</p>
                <Link
                  href="/dashboard/proposals"
                  className="mt-3 inline-block text-sm text-on-surface underline"
                >
                  عرض تفاصيل عرضي
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-primary px-8 py-3 font-semibold text-white"
              >
                قدّم عرضك
              </button>
            )
          ) : (
            <p className="text-slate-600">التقديم متاح للمستقلين فقط</p>
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
