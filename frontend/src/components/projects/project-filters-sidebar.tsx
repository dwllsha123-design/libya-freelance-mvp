'use client';

import type { Category, City, Skill } from '@/lib/api';
import type { ProjectFilters } from '@/lib/project-filters';

interface ProjectFiltersSidebarProps {
  filters: ProjectFilters;
  categories: Category[];
  skills: Skill[];
  cities: City[];
  onChange: (patch: Partial<ProjectFilters>) => void;
  onClear: () => void;
}

const WORK_MODE_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'REMOTE', label: 'عن بُعد' },
  { value: 'ON_SITE', label: 'في الموقع' },
  { value: 'HYBRID', label: 'هجين' },
];

const BUDGET_TYPE_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'FIXED', label: 'سعر ثابت' },
  { value: 'HOURLY', label: 'بالساعة' },
];

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'ENTRY', label: 'مبتدئ' },
  { value: 'INTERMEDIATE', label: 'متوسط' },
  { value: 'EXPERT', label: 'خبير' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'budget_high', label: 'الأعلى ميزانية' },
  { value: 'budget_low', label: 'الأقل ميزانية' },
];

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
  const locationCities = cities.filter((c) => !c.isRemote);

  return (
    <div className="space-y-4 rounded-xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-[#0B132B]">الفلاتر</p>
        <button
          type="button"
          onClick={onClear}
          className="text-sm text-[#00A86B] hover:underline"
        >
          مسح الفلاتر
        </button>
      </div>

      <SelectField
        label="الترتيب"
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => onChange({ sort, page: '1' })}
      />

      <SelectField
        label="التصنيف"
        value={filters.category}
        options={[
          { value: '', label: 'الكل' },
          ...categories.map((c) => ({ value: c.slug, label: c.nameAr })),
        ]}
        onChange={(category) => onChange({ category, page: '1' })}
      />

      <SelectField
        label="المهارة"
        value={filters.skill}
        options={[
          { value: '', label: 'الكل' },
          ...skills.map((s) => ({ value: s.slug, label: s.name })),
        ]}
        onChange={(skill) => onChange({ skill, page: '1' })}
      />

      <SelectField
        label="المدينة"
        value={filters.city}
        options={[
          { value: '', label: 'الكل' },
          ...locationCities.map((c) => ({ value: c.slug, label: c.nameAr })),
        ]}
        onChange={(city) => onChange({ city, page: '1' })}
      />

      <SelectField
        label="نمط العمل"
        value={filters.workMode}
        options={WORK_MODE_OPTIONS}
        onChange={(workMode) => onChange({ workMode, page: '1' })}
      />

      <SelectField
        label="نوع الميزانية"
        value={filters.budgetType}
        options={BUDGET_TYPE_OPTIONS}
        onChange={(budgetType) => onChange({ budgetType, page: '1' })}
      />

      <SelectField
        label="مستوى الخبرة"
        value={filters.experienceLevel}
        options={EXPERIENCE_OPTIONS}
        onChange={(experienceLevel) => onChange({ experienceLevel, page: '1' })}
      />

      <div>
        <label className="text-sm font-medium text-slate-700">الحد الأدنى للميزانية</label>
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
        <label className="text-sm font-medium text-slate-700">الحد الأقصى للميزانية</label>
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
