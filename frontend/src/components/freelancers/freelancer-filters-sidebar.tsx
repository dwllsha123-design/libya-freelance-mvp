'use client';

import { useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { Category, City, Skill } from '@/lib/api';
import type { FreelancerFilters } from '@/lib/freelancer-filters';
import { DISCOVERY_MAPPED_CATEGORY_SLUGS } from '@/lib/freelancer-filters';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import { useWorkModeConfig } from '@/contexts/work-mode-context';

interface FreelancerFiltersSidebarProps {
  filters: FreelancerFilters;
  categories: Category[];
  skills: Skill[];
  cities: City[];
  onChange: (patch: Partial<FreelancerFilters>) => void;
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
      <label className="text-sm font-medium text-ink">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink"
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

export function FreelancerFiltersSidebar({
  filters,
  categories,
  skills,
  cities,
  onChange,
  onClear,
}: FreelancerFiltersSidebarProps) {
  const t = useTranslations('freelancers');
  const tProjects = useTranslations('projects');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { showFilter } = useWorkModeConfig();

  const categoryOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      ...categories
        .filter((c) => DISCOVERY_MAPPED_CATEGORY_SLUGS.has(c.slug))
        .map((c) => ({
          value: c.slug,
          label: getLocalizedCategoryName(c, locale),
        })),
    ],
    [categories, locale, tCommon],
  );

  const skillOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      ...skills.map((s) => ({ value: s.slug, label: s.name })),
    ],
    [skills, tCommon],
  );

  const cityOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      ...cities
        .filter((c) => (c.country ?? 'Libya') === 'Libya')
        .map((c) => ({
          value: c.slug,
          label: getLocalizedCityName(c, locale),
        })),
    ],
    [cities, locale, tCommon],
  );

  const workModeOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: 'REMOTE', label: tProjects('workModeRemote') },
      { value: 'ON_SITE', label: tProjects('workModeOnSite') },
      { value: 'HYBRID', label: tProjects('workModeHybrid') },
    ],
    [tProjects, tCommon],
  );

  const availabilityOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: 'AVAILABLE', label: t('availabilityAvailable') },
      { value: 'BUSY', label: t('availabilityBusy') },
      { value: 'UNAVAILABLE', label: t('availabilityUnavailable') },
    ],
    [t, tCommon],
  );

  const ratingOptions = useMemo(
    () => [
      { value: '', label: tCommon('all') },
      { value: '4.5', label: t('minRatingOption', { rating: '4.5' }) },
      { value: '4', label: t('minRatingOption', { rating: '4' }) },
      { value: '3', label: t('minRatingOption', { rating: '3' }) },
    ],
    [t, tCommon],
  );

  const activityOptions = useMemo(
    () => [
      { value: '', label: t('activity.all') },
      { value: 'online', label: t('activity.online') },
      { value: 'active_today', label: t('activity.active_today') },
      { value: 'active_week', label: t('activity.active_week') },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-bold text-ink">{t('filtersTitle')}</h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs font-semibold text-ember hover:underline"
        >
          {tCommon('clearFilters')}
        </button>
      </div>

      <SelectField
        label={t('filterCategory')}
        value={filters.category}
        options={categoryOptions}
        onChange={(category) => onChange({ category, page: '1' })}
      />

      <SelectField
        label={t('filterSkill')}
        value={filters.skill}
        options={skillOptions}
        onChange={(skill) => onChange({ skill, page: '1' })}
      />

      <SelectField
        label={t('filterLocation')}
        value={filters.city}
        options={cityOptions}
        onChange={(city) => onChange({ city, page: '1' })}
      />

      {showFilter ? (
        <SelectField
          label={t('filterWorkMode')}
          value={filters.workMode}
          options={workModeOptions}
          onChange={(workMode) => onChange({ workMode, page: '1' })}
        />
      ) : null}

      <SelectField
        label={t('filterMinRating')}
        value={filters.minRating}
        options={ratingOptions}
        onChange={(minRating) => onChange({ minRating, page: '1' })}
      />

      <SelectField
        label={t('filterAvailability')}
        value={filters.availability}
        options={availabilityOptions}
        onChange={(availability) => onChange({ availability, page: '1' })}
      />

      <SelectField
        label={t('activityLabel')}
        value={filters.activity}
        options={activityOptions}
        onChange={(activity) => onChange({ activity, page: '1' })}
      />

      <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          checked={filters.verified === 'true'}
          onChange={(e) =>
            onChange({ verified: e.target.checked ? 'true' : '', page: '1' })
          }
          className="size-4 rounded border-line text-ember focus:ring-ember"
        />
        <span>{t('filterVerified')}</span>
      </label>
    </div>
  );
}
