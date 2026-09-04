'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { useProfileData } from '@/hooks/use-profile';
import { ProfilePhotoUpload } from '@/components/profile/profile-photo-upload';
import { getLocalizedCityName } from '@/lib/locale-content';
import { PROFILE_COUNTRIES } from '@/lib/profile-location';
import type { AppLocale } from '@/i18n/routing';
import { ApiError } from '@/lib/api';
import { useState } from 'react';

export default function ProfileEditPage() {
  const t = useTranslations('profile');
  const tProjects = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { user, accessToken, isLoading: authLoading } = useAuth();
  const {
    profile,
    skills,
    allSkills,
    cities,
    isLoading,
    error,
    setProfilePhoto,
    updateProfile,
    addSkill,
    removeSkill,
  } = useProfileData();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (authLoading || isLoading) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4">{t('loginRequired')}</p>
        <Link href="/login" className="text-primary">{tDashboard('login')}</Link>
      </div>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaveSuccess(false);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);

    try {
      await updateProfile({
        firstName: String(formData.get('firstName') ?? ''),
        lastName: String(formData.get('lastName') ?? ''),
        username: String(formData.get('username') ?? ''),
        bio: String(formData.get('bio') ?? ''),
        country: String(formData.get('country') ?? '') || undefined,
        cityId: String(formData.get('cityId') ?? '') || undefined,
        workMode: String(formData.get('workMode') ?? 'ON_SITE'),
        professionalTitle: String(formData.get('professionalTitle') ?? ''),
        displayName: String(formData.get('displayName') ?? ''),
      });
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">{t('editProfile')}</h1>

      {error ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {saveError ? (
        <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
      ) : null}
      {saveSuccess ? (
        <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{t('saveSuccess')}</div>
      ) : null}

      {profile && accessToken ? (
        <ProfilePhotoUpload
          currentPhoto={profile.profilePhoto}
          accessToken={accessToken}
          onUploaded={setProfilePhoto}
        />
      ) : null}

      {profile ? (
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('firstName')}</label>
              <input name="firstName" defaultValue={profile.firstName} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('lastName')}</label>
              <input name="lastName" defaultValue={profile.lastName} className="w-full rounded-lg border px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('username')}</label>
            <input name="username" defaultValue={profile.username} className="w-full rounded-lg border px-3 py-2" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('bio')}</label>
            <textarea name="bio" defaultValue={profile.bio ?? ''} rows={4} className="w-full rounded-lg border px-3 py-2" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('country')}</label>
              <select
                name="country"
                defaultValue={profile.country || 'Libya'}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">{tProjects('choose')}</option>
                {PROFILE_COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {locale === 'en' ? country.nameEn : country.nameAr}
                  </option>
                ))}
                {profile.country &&
                !PROFILE_COUNTRIES.some((c) => c.value === profile.country) ? (
                  <option value={profile.country}>{profile.country}</option>
                ) : null}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('city')}</label>
              <select name="cityId" defaultValue={profile.city?.id ?? ''} className="w-full rounded-lg border px-3 py-2">
                <option value="">{tProjects('choose')}</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>{getLocalizedCityName(city, locale)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('workMode')}</label>
            <select name="workMode" defaultValue={profile.workMode} className="w-full rounded-lg border px-3 py-2">
              <option value="ON_SITE">{tProjects('workModeOnSite')}</option>
              <option value="REMOTE">{tProjects('workModeRemote')}</option>
              <option value="HYBRID">{tProjects('workModeHybrid')}</option>
            </select>
          </div>

          {user.role === 'FREELANCER' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('professionalTitle')}</label>
              <input
                name="professionalTitle"
                defaultValue={profile.freelancer?.professionalTitle ?? ''}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : null}

          {user.role === 'CLIENT' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('displayNameOptional')}</label>
              <input
                name="displayName"
                defaultValue={profile.client?.displayName ?? ''}
                className="w-full rounded-lg border px-3 py-2"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-primary px-6 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSaving ? tCommon('saving') : t('saveChanges')}
          </button>
        </form>
      ) : null}

      {user.role === 'FREELANCER' ? (
        <section className="mt-10">
          <h2 className="text-xl font-bold">{t('skills')}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => removeSkill(skill.id)}
                className="rounded-full bg-on-surface px-3 py-1 text-sm text-white"
              >
                {skill.name} ×
              </button>
            ))}
          </div>
          {skills.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{t('noSkillsYet')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {allSkills
              .filter((s) => !skills.some((ms) => ms.id === s.id))
              .map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => addSkill(skill.id)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-sm"
                >
                  + {skill.name}
                </button>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
