'use client';

import { useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { Category, City, Skill } from '@/lib/api';
import type { ManageProject } from '@/lib/schemas/project';
import { projectDraftSchema } from '@/lib/schemas/project';
import { createProjectFormSchema } from '@/lib/schemas/create-schemas';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import { ApiError } from '@/lib/api';

export interface ProjectFormValues {
  title: string;
  description: string;
  categoryId: string;
  skillIds: string[];
  budgetType: 'FIXED' | 'HOURLY';
  budgetMin: number;
  budgetMax: number;
  experienceLevel: 'ENTRY' | 'INTERMEDIATE' | 'EXPERT';
  workMode: 'ON_SITE' | 'REMOTE' | 'HYBRID';
  cityId?: string;
  deadline?: string;
}

interface ProjectFormProps {
  initial?: ManageProject | null;
  prefill?: Partial<ProjectFormValues>;
  categories: Category[];
  skills: Skill[];
  cities: City[];
  isSubmitting: boolean;
  onSaveDraft: (values: ProjectFormValues) => Promise<void>;
  onPublish: (values: ProjectFormValues) => Promise<void>;
}

const defaultValues: ProjectFormValues = {
  title: '',
  description: '',
  categoryId: '',
  skillIds: [],
  budgetType: 'FIXED',
  budgetMin: 0,
  budgetMax: 0,
  experienceLevel: 'INTERMEDIATE',
  workMode: 'REMOTE',
};

function mapInitialToValues(initial: ManageProject): ProjectFormValues {
  return {
    title: initial.title,
    description: initial.description,
    categoryId: initial.category.id,
    skillIds: initial.skills.map((s) => s.id),
    budgetType: initial.budgetType as 'FIXED' | 'HOURLY',
    budgetMin: initial.budgetMin,
    budgetMax: initial.budgetMax,
    experienceLevel: initial.experienceLevel as ProjectFormValues['experienceLevel'],
    workMode: initial.workMode as ProjectFormValues['workMode'],
    cityId: initial.city?.id,
    deadline: initial.deadline?.slice(0, 10),
  };
}

export function ProjectForm({
  initial,
  prefill,
  categories,
  skills,
  cities,
  isSubmitting,
  onSaveDraft,
  onPublish,
}: ProjectFormProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const tValidation = useTranslations('validation');
  const locale = useLocale() as AppLocale;

  const projectFormSchema = useMemo(
    () => createProjectFormSchema((key) => tValidation(key)),
    [tValidation],
  );

  const [values, setValues] = useState<ProjectFormValues>(() =>
    initial
      ? mapInitialToValues(initial)
      : { ...defaultValues, ...prefill },
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  function update<K extends keyof ProjectFormValues>(
    key: K,
    value: ProjectFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  }

  function toggleSkill(skillId: string) {
    setValues((prev) => ({
      ...prev,
      skillIds: prev.skillIds.includes(skillId)
        ? prev.skillIds.filter((id) => id !== skillId)
        : [...prev.skillIds, skillId],
    }));
  }

  async function handleDraft() {
    setFormError(null);
    const parsed = projectDraftSchema.safeParse(values);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errors[i.path[0] as string] = i.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await onSaveDraft(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('saveFailed'));
    }
  }

  async function handlePublish() {
    setFormError(null);
    const parsed = projectFormSchema.safeParse(values);

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      parsed.error.issues.forEach((i) => {
        errors[i.path[0] as string] = i.message;
      });
      setFieldErrors(errors);
      return;
    }

    try {
      await onPublish(values);
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t('publishFailed'));
    }
  }

  const physicalCities = cities.filter(
    (c) => !c.isRemote && (c.country ?? 'Libya') === 'Libya',
  );
  const currencyLabel = tCommon('lyd');

  return (
    <div className="space-y-8">
      {formError ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
      ) : null}

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('projectBasics')}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm">{t('projectTitle')}</label>
            <input
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            {fieldErrors.title ? <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">{t('projectDescription')}</label>
            <textarea
              value={values.description}
              onChange={(e) => update('description', e.target.value)}
              rows={6}
              className="w-full rounded-lg border px-3 py-2"
            />
            {fieldErrors.description ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.description}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('categoryAndSkills')}</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm">{t('category')}</label>
            <select
              value={values.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">{t('choose')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{getLocalizedCategoryName(c, locale)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm">{t('requiredSkills')}</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    values.skillIds.includes(skill.id)
                      ? 'bg-primary text-white'
                      : 'border border-slate-300'
                  }`}
                >
                  {skill.name}
                </button>
              ))}
            </div>
            {fieldErrors.skillIds ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.skillIds}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('budgetSection')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm">{t('budgetType')}</label>
            <select
              value={values.budgetType}
              onChange={(e) => update('budgetType', e.target.value as 'FIXED' | 'HOURLY')}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="FIXED">{t('budgetTypeFixed')}</option>
              <option value="HOURLY">{t('budgetTypeHourly')}</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">{t('minBudget')} ({currencyLabel})</label>
            <input
              type="number"
              value={values.budgetMin}
              onChange={(e) => update('budgetMin', Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">{t('maxBudget')} ({currencyLabel})</label>
            <input
              type="number"
              value={values.budgetMax}
              onChange={(e) => update('budgetMax', Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            />
            {fieldErrors.budgetMax ? (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.budgetMax}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('experienceSection')}</h2>
        <select
          value={values.experienceLevel}
          onChange={(e) =>
            update('experienceLevel', e.target.value as ProjectFormValues['experienceLevel'])
          }
          className="mt-4 w-full rounded-lg border px-3 py-2"
        >
          <option value="ENTRY">{t('experienceEntry')}</option>
          <option value="INTERMEDIATE">{t('experienceIntermediate')}</option>
          <option value="EXPERT">{t('experienceExpert')}</option>
        </select>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('locationSection')}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">{t('workMode')}</label>
            <select
              value={values.workMode}
              onChange={(e) => update('workMode', e.target.value as ProjectFormValues['workMode'])}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="REMOTE">{t('workModeRemote')}</option>
              <option value="ON_SITE">{t('workModeOnSite')}</option>
              <option value="HYBRID">{t('workModeHybrid')}</option>
            </select>
          </div>
          {values.workMode !== 'REMOTE' ? (
            <div>
              <label className="mb-1 block text-sm">{t('city')}</label>
              <select
                value={values.cityId ?? ''}
                onChange={(e) => update('cityId', e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">{t('choose')}</option>
                {physicalCities.map((city) => (
                  <option key={city.id} value={city.id}>{getLocalizedCityName(city, locale)}</option>
                ))}
              </select>
              {fieldErrors.cityId ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.cityId}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-on-surface">{t('deadlineSection')}</h2>
        <input
          type="date"
          value={values.deadline ?? ''}
          onChange={(e) => update('deadline', e.target.value)}
          className="mt-4 w-full rounded-lg border px-3 py-2 sm:max-w-xs"
        />
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleDraft()}
          className="rounded-lg border border-secondary px-6 py-2.5 font-semibold disabled:opacity-60"
        >
          {t('saveDraft')}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handlePublish()}
          className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? tCommon('saving') : t('publishProject')}
        </button>
      </div>
    </div>
  );
}
