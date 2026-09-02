'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { BackLink } from '@/components/ui/back-link';
import { useAuth } from '@/contexts/auth-context';
import { ProjectForm, type ProjectFormValues } from '@/components/projects/project-form';
import { useProjectsApi } from '@/hooks/use-projects';
import type { Category, City, Skill } from '@/lib/api';
import { consumeProjectBriefDraft } from '@/lib/project-brief';

export default function NewProjectPage() {
  const t = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const api = useProjectsApi();
  const [categories, setCategories] = useState<Category[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [prefill] = useState(() => {
    const draft = consumeProjectBriefDraft();
    if (!draft) return {};
    return { title: draft.title, description: draft.description };
  });

  useEffect(() => {
    api.loadFormData().then(([cats, sk, ct]) => {
      setCategories(cats);
      setSkills(sk);
      setCities(ct);
      setIsLoading(false);
    });
  }, [api]);

  function toPayload(values: ProjectFormValues) {
    return {
      ...values,
      cityId: values.workMode === 'REMOTE' ? undefined : values.cityId,
      deadline: values.deadline || undefined,
    };
  }

  async function saveDraft(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const payload = toPayload(values);
      if (projectId) {
        await api.update(projectId, payload);
      } else {
        const created = await api.create(payload);
        setProjectId(created.id);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function publish(values: ProjectFormValues) {
    setIsSubmitting(true);
    try {
      const payload = toPayload(values);
      let id = projectId;
      if (id) {
        await api.update(id, payload);
      } else {
        const created = await api.create(payload);
        id = created.id;
        setProjectId(id);
      }
      await api.publish(id);
      router.push('/dashboard/projects');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user || user.role !== 'CLIENT') {
    return (
      <div className="p-8 text-center">
        <p>{tDashboard('clientsOnly')}</p>
        <Link href="/dashboard">{tCommon('back')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <BackLink href="/dashboard/projects">{tDashboard('myProjects')}</BackLink>
      <h1 className="mt-4 text-3xl font-bold text-on-surface">{t('newProject')}</h1>
      <div className="mt-8">
        <ProjectForm
          prefill={prefill}
          categories={categories}
          skills={skills}
          cities={cities}
          isSubmitting={isSubmitting}
          onSaveDraft={saveDraft}
          onPublish={publish}
        />
      </div>
    </div>
  );
}
