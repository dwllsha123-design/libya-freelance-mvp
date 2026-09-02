'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { Category, City, Skill } from '@/lib/api';
import type { ProjectFilters } from '@/lib/project-filters';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';

interface ProjectFiltersSidebarProps {
  filters: ProjectFilters;
  categories: Category[];
  skills: Skill[];
  cities: City[];
  onChange: (patch: Partial<ProjectFilters>) => void;
  onClear: () => void;
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
      >
        {options.map((opt) => (
          <option key={opt.value || 'all'} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ProjectFiltersSidebar({
  filters,
  categories,
  skills,
  cities,
  onChange,
  onClear,
}: ProjectFiltersSidebarProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;

  const workModeOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: 'REMOTE', label: t('workModeRemote') },
      { value: 'ON_SITE', label: t('workModeOnSite') },
      { value: 'HYBRID', label: t('workModeHybrid') },
    ],
    [t, tCommon],
  );

  const budgetTypeOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: 'FIXED', label: t('budgetTypeFixed') },
      { value: 'HOURLY', label: t('budgetTypeHourly') },
    ],
    [t, tCommon],
  );

  const experienceOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: 'ENTRY', label: t('experienceEntry') },
      { value: 'INTERMEDIATE', label: t('experienceIntermediate') },
      { value: 'EXPERT', label: t('experienceExpert') },
    ],
    [t, tCommon],
  );

  const sortOptions = useMemo(
    () => [
      { value: 'newest', label: t('sortNewest') },
      { value: 'oldest', label: t('sortOldest') },
      { value: 'budget_high', label: t('sortBudgetHigh') },
      { value: 'budget_low', label: t('sortBudgetLow') },
    ],
    [t],
  );

  const locationCities = cities.filter((c) => !c.isRemote);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-on-surface">{t('filters')}</p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-primary hover:underline"
        >
          {tCommon('clearFilters')}
        </button>
      </div>

      <SelectField
        label={t('sort')}
        value={filters.sort}
        options={sortOptions}
        onChange={(sort) => onChange({ sort, page: '1' })}
      />

      <SelectField
        label={t('category')}
        value={filters.category}
        options={[
          { value: '', label: tCommon('all') },
          ...categories.map((c) => ({
            value: c.slug,
            label: getLocalizedCategoryName(c, locale),
          })),
        ]}
        onChange={(category) => onChange({ category, page: '1' })}
      />

      <SelectField
        label={t('skill')}
        value={filters.skill}
        options={[
          { value: '', label: tCommon('all') },
          ...skills.map((s) => ({ value: s.slug, label: s.name })),
        ]}
        onChange={(skill) => onChange({ skill, page: '1' })}
      />

      <SelectField
        label={t('city')}
        value={filters.city}
        options={[
          { value: '', label: tCommon('all') },
          ...locationCities.map((c) => ({
            value: c.slug,
            label: getLocalizedCityName(c, locale),
          })),
        ]}
        onChange={(city) => onChange({ city, page: '1' })}
      />

      <SelectField
        label={t('workMode')}
        value={filters.workMode}
        options={workModeOptions}
        onChange={(workMode) => onChange({ workMode, page: '1' })}
      />

      <SelectField
        label={t('budgetType')}
        value={filters.budgetType}
        options={budgetTypeOptions}
        onChange={(budgetType) => onChange({ budgetType, page: '1' })}
      />

      <SelectField
        label={t('experience')}
        value={filters.experienceLevel}
        options={experienceOptions}
        onChange={(experienceLevel) => onChange({ experienceLevel, page: '1' })}
      />

      <div>
        <label className="text-sm font-medium text-slate-700">{t('minBudgetLabel')}</label>
        <input
          type="number"
          min={0}
          value={filters.minBudget}
          onChange={(e) => onChange({ minBudget: e.target.value, page: '1' })}
          placeholder="0"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">{t('maxBudgetLabel')}</label>
        <input
          type="number"
          min={0}
          value={filters.maxBudget}
          onChange={(e) => onChange({ maxBudget: e.target.value, page: '1' })}
          placeholder="50000"
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
