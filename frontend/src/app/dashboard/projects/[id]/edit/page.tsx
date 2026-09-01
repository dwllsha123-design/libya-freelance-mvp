'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BackLink } from '@/components/ui/back-link';
import { ProjectStatusActions } from '@/components/projects/project-status-actions';
import { ProjectCompletionPanel } from '@/components/projects/project-completion-panel';
import { useAuth } from '@/contexts/auth-context';
import { ProjectForm, type ProjectFormValues } from '@/components/projects/project-form';
import { useProjectsApi } from '@/hooks/use-projects';
import type { Category, City, Skill } from '@/lib/api';
import type { ManageProject } from '@/lib/schemas/project';

export default function EditProjectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useProjectsApi();
  const [project, setProject] = useState<ManageProject | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getManage(params.id), api.loadFormData()])
      .then(([proj, formData]) => {
        const [cats, sk, ct] = formData;
        setProject(proj);
        setCategories(cats);
        setSkills(sk);
        setCities(ct);
      })
      .catch(() => setError('المشروع غير موجود أو غير مصرح'))
      .finally(() => setIsLoading(false));
  }, [api, params.id]);

  function toPayload(values: ProjectFormValues) {
    return {
      ...values,
      cityId: values.workMode === 'REMOTE' ? null : values.cityId,
      deadline: values.deadline || null,
    };
  }

  async function saveDraft(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const updated = await api.update(params.id, toPayload(values));
      setProject(updated);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function publish(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      await api.update(params.id, toPayload(values));
      if (project?.status === 'DRAFT') {
        await api.publish(params.id);
      }
      router.push('/dashboard/projects');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClose() {
    await api.close(params.id);
    router.push('/dashboard/projects');
  }

  async function handleCancel() {
    await api.cancel(params.id);
    router.push('/dashboard/projects');
  }

  async function handleDelete() {
    await api.delete(params.id);
    router.push('/dashboard/projects');
  }

  if (authLoading || isLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (error || !project) {
    return <div className="p-8 text-center text-red-600">{error ?? 'غير موجود'}</div>;
  }

  if (!user || user.role !== 'CLIENT') {
    return <div className="p-8 text-center">غير مصرح</div>;
  }

  const readOnly =
    project.status === 'CLOSED' ||
    project.status === 'CANCELLED' ||
    project.status === 'IN_PROGRESS' ||
    project.status === 'COMPLETED';

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackLink href="/dashboard/projects">مشاريعي</BackLink>
      <h1 className="mt-4 text-3xl font-bold text-[#0B132B]">تعديل المشروع</h1>

      {readOnly ? (
        <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          هذا المشروع للقراءة فقط ولا يمكن تعديله في حالته الحالية.
        </p>
      ) : null}

      <div className="mt-4">
        <ProjectCompletionPanel
          project={project}
          onUpdated={(updated) => setProject(updated)}
        />
        <ProjectStatusActions
          project={project}
          onClose={handleClose}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      </div>

      <div className="mt-8">
        {readOnly ? null : (
        <ProjectForm
          key={project.id}
          initial={project}
          categories={categories}
          skills={skills}
          cities={cities}
          isSubmitting={isSubmitting}
          onSaveDraft={saveDraft}
          onPublish={publish}
        />
        )}
      </div>
    </div>
  );
}
