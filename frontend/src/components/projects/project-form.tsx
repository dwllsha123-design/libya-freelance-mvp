'use client';

import { useState } from 'react';
import type { Category, City, Skill } from '@/lib/api';
import type { ManageProject } from '@/lib/schemas/project';
import { projectDraftSchema, projectFormSchema } from '@/lib/schemas/project';
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
  categories,
  skills,
  cities,
  isSubmitting,
  onSaveDraft,
  onPublish,
}: ProjectFormProps) {
  const [values, setValues] = useState<ProjectFormValues>(() =>
    initial ? mapInitialToValues(initial) : defaultValues,
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
      setFormError(err instanceof ApiError ? err.message : 'فشل الحفظ');
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
      setFormError(err instanceof ApiError ? err.message : 'فشل النشر');
    }
  }

  const physicalCities = cities.filter((c) => !c.isRemote);

  return (
    <div className="space-y-8">
      {formError ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{formError}</div>
      ) : null}

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-[#0B132B]">1. أساسيات المشروع</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm">عنوان المشروع</label>
            <input
              value={values.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
            {fieldErrors.title ? <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm">وصف المشروع</label>
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
        <h2 className="font-semibold text-[#0B132B]">2. التصنيف والمهارات</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-sm">التصنيف</label>
            <select
              value={values.categoryId}
              onChange={(e) => update('categoryId', e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="">— اختر —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nameAr}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm">المهارات المطلوبة</label>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => toggleSkill(skill.id)}
                  className={`rounded-full px-3 py-1 text-sm ${
                    values.skillIds.includes(skill.id)
                      ? 'bg-[#00A86B] text-white'
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
        <h2 className="font-semibold text-[#0B132B]">3. الميزانية</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm">نوع الميزانية</label>
            <select
              value={values.budgetType}
              onChange={(e) => update('budgetType', e.target.value as 'FIXED' | 'HOURLY')}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="FIXED">سعر ثابت</option>
              <option value="HOURLY">بالساعة</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm">الحد الأدنى (د.ل)</label>
            <input
              type="number"
              value={values.budgetMin}
              onChange={(e) => update('budgetMin', Number(e.target.value))}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm">الحد الأعلى (د.ل)</label>
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
        <h2 className="font-semibold text-[#0B132B]">4. مستوى الخبرة</h2>
        <select
          value={values.experienceLevel}
          onChange={(e) =>
            update('experienceLevel', e.target.value as ProjectFormValues['experienceLevel'])
          }
          className="mt-4 w-full rounded-lg border px-3 py-2"
        >
          <option value="ENTRY">مبتدئ</option>
          <option value="INTERMEDIATE">متوسط</option>
          <option value="EXPERT">خبير</option>
        </select>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="font-semibold text-[#0B132B]">5. الموقع</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm">نمط العمل</label>
            <select
              value={values.workMode}
              onChange={(e) => update('workMode', e.target.value as ProjectFormValues['workMode'])}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="REMOTE">عن بُعد</option>
              <option value="ON_SITE">في الموقع</option>
              <option value="HYBRID">هجين</option>
            </select>
          </div>
          {values.workMode !== 'REMOTE' ? (
            <div>
              <label className="mb-1 block text-sm">المدينة</label>
              <select
                value={values.cityId ?? ''}
                onChange={(e) => update('cityId', e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">— اختر —</option>
                {physicalCities.map((city) => (
                  <option key={city.id} value={city.id}>{city.nameAr}</option>
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
        <h2 className="font-semibold text-[#0B132B]">6. موعد التسليم</h2>
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
          className="rounded-lg border border-[#0B132B] px-6 py-2.5 font-semibold disabled:opacity-60"
        >
          حفظ كمسودة
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handlePublish()}
          className="rounded-lg bg-[#00A86B] px-6 py-2.5 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'جاري الحفظ...' : 'نشر المشروع'}
        </button>
      </div>
    </div>
  );
}
