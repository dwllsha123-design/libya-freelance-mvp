'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import {
  staffCanManageUsers,
  useAdminApi,
  type AdminFreelancerEditPayload,
  type AdminMeSession,
} from '@/hooks/use-admin';
import { apiRequest, getApiErrorMessage } from '@/lib/api';
import { PROFILE_COUNTRIES } from '@/lib/profile-location';
import { getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { City, Skill } from '@/lib/api';

const WORK_MODES = ['REMOTE', 'ON_SITE', 'HYBRID'] as const;
const AVAILABILITY = ['AVAILABLE', 'BUSY', 'UNAVAILABLE'] as const;

export default function AdminFreelancerEditPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const params = useParams<{ id: string }>();
  const api = useAdminApi();

  const [staffSession, setStaffSession] = useState<AdminMeSession | null>(null);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const canEditAccounts = staffCanManageUsers(staffSession);

  const [data, setData] = useState<AdminFreelancerEditPayload | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [allSkills, setAllSkills] = useState<Skill[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [professionalTitle, setProfessionalTitle] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('Libya');
  const [cityId, setCityId] = useState('');
  const [workMode, setWorkMode] = useState('REMOTE');
  const [availability, setAvailability] = useState('AVAILABLE');
  const [hourlyRate, setHourlyRate] = useState('');
  const [skillIds, setSkillIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    api
      .me()
      .then((me) => {
        if (!cancelled) {
          setStaffSession(me);
          setPermissionChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStaffSession(null);
          setPermissionChecked(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    if (!permissionChecked || !canEditAccounts) return;
    let cancelled = false;
    Promise.all([
      api.getFreelancerEdit(params.id),
      apiRequest<City[]>('/cities').catch(() => [] as City[]),
      apiRequest<Skill[]>('/skills').catch(() => [] as Skill[]),
    ])
      .then(([edit, cityList, skillList]) => {
        if (cancelled) return;
        setData(edit);
        setCities(cityList);
        setAllSkills(skillList);
        setFirstName(edit.firstName);
        setLastName(edit.lastName);
        setProfessionalTitle(edit.professionalTitle ?? '');
        setBio(edit.bio ?? '');
        setPhone(edit.phone ?? '');
        setCountry(edit.country || 'Libya');
        setCityId(edit.cityId ?? '');
        setWorkMode(edit.workMode || 'REMOTE');
        setAvailability(edit.availability || 'AVAILABLE');
        setHourlyRate(
          edit.hourlyRate != null && !Number.isNaN(edit.hourlyRate)
            ? String(edit.hourlyRate)
            : '',
        );
        setSkillIds(edit.skillIds ?? []);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : getApiErrorMessage(locale, 'unexpected'));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [api, params.id, locale, permissionChecked, canEditAccounts]);

  const citiesForCountry = useMemo(() => {
    if (!country || country === 'Other') return [];
    return cities.filter((c) => (c.country ?? 'Libya') === country);
  }, [cities, country]);

  function toggleSkill(id: string) {
    setSkillIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const rateTrim = hourlyRate.trim();
      // Always send skillIds from the form so the intentional selection (incl. empty) is applied.
      const updated = await api.updateFreelancer(params.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        professionalTitle: professionalTitle.trim(),
        bio: bio.trim(),
        phone: phone.trim(),
        country,
        cityId: country === 'Other' ? null : cityId || null,
        workMode,
        availability,
        hourlyRate: rateTrim === '' ? null : Number(rateTrim),
        skillIds,
      });
      setData(updated);
      setCityId(updated.cityId ?? '');
      setSkillIds(updated.skillIds ?? []);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
    } finally {
      setSaving(false);
    }
  }

  async function onPhotoChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const updated = await api.uploadFreelancerPhoto(params.id, file);
      setData(updated);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : getApiErrorMessage(locale, 'unexpected'));
    } finally {
      setUploading(false);
    }
  }

  if (!permissionChecked) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (!canEditAccounts) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title={t('editAccount')}
          breadcrumb={
            <Link href="/admin/freelancers" className="hover:text-primary">
              {t('freelancers')}
            </Link>
          }
        />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('accessDenied')}
        </p>
      </div>
    );
  }

  if (!data && !error) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <AdminPageHeader
          title={t('editAccount')}
          breadcrumb={
            <Link href="/admin/freelancers" className="hover:text-primary">
              {t('freelancers')}
            </Link>
          }
        />
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title={t('editAccount')}
        subtitle={data.email}
        breadcrumb={
          <Link href="/admin/freelancers" className="hover:text-primary">
            {t('freelancers')}
          </Link>
        }
        actions={
          <Link href={`/admin/users/${data.id}`} className="text-sm text-primary">
            {t('viewProfile')}
          </Link>
        }
      />

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {t('freelancerEditSaved')}
        </p>
      ) : null}

      <AdminPanel title={t('profileInfo')}>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            {data.profilePhoto ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.profilePhoto}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg">
                {(data.firstName[0] ?? '?').toUpperCase()}
              </span>
            )}
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('profilePhoto')}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={uploading || saving}
                onChange={(e) => void onPhotoChange(e.target.files?.[0])}
                className="block text-sm"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('firstName')}</span>
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('lastName')}</span>
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>

          <p className="text-xs text-slate-500">
            {t('displayName')}: {`${firstName} ${lastName}`.trim() || '—'}
          </p>
          <p className="text-xs text-slate-500">@{data.username}</p>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t('professionalTitle')}</span>
            <input
              value={professionalTitle}
              onChange={(e) => setProfessionalTitle(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">{t('bio')}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full rounded-lg border px-3 py-2"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('phone')}</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('hourlyRate')}</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('country')}</span>
              <select
                value={country}
                onChange={(e) => {
                  setCountry(e.target.value);
                  setCityId('');
                }}
                className="w-full rounded-lg border px-3 py-2"
              >
                {PROFILE_COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {locale === 'ar' ? c.nameAr : c.nameEn}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('city')}</span>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                disabled={country === 'Other'}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">—</option>
                {citiesForCountry.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getLocalizedCityName(c, locale)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('workMode')}</span>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                {WORK_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">{t('availability')}</span>
              <select
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                {AVAILABILITY.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <fieldset>
            <legend className="mb-2 text-sm text-slate-600">{t('skills')}</legend>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-lg border p-3">
              {allSkills.map((skill) => {
                const selected = skillIds.includes(skill.id);
                return (
                  <button
                    key={skill.id}
                    type="button"
                    onClick={() => toggleSkill(skill.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      selected
                        ? 'bg-primary text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {skill.name}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || uploading}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {saving ? tCommon('loading') : t('saveChanges')}
            </button>
            <Link
              href="/admin/freelancers"
              className="rounded-xl border px-4 py-2 text-sm"
            >
              {tCommon('cancel')}
            </Link>
          </div>
        </form>
      </AdminPanel>
    </div>
  );
}
