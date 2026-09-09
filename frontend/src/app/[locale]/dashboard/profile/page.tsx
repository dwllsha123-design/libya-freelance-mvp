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
import { useMemo, useState } from 'react';
import { useWorkModeConfig } from '@/contexts/work-mode-context';
import type { WorkModeValue } from '@/lib/work-mode';

export default function ProfileEditPage() {
  const t = useTranslations('profile');
  const tProjects = useTranslations('projects');
  const tDashboard = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const { showPicker, isEnabled, defaultWorkMode } = useWorkModeConfig();
  const { user, accessToken, isLoading: authLoading, updateProfilePhoto } = useAuth();
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
  const [selectedCountry, setSelectedCountry] = useState('Libya');
  const [selectedCityId, setSelectedCityId] = useState('');
  const profileLocationKey = profile
    ? `${profile.country ?? 'Libya'}|${profile.city?.id ?? ''}`
    : null;
  const [appliedLocationKey, setAppliedLocationKey] = useState<string | null>(null);

  if (profileLocationKey !== null && profileLocationKey !== appliedLocationKey) {
    setAppliedLocationKey(profileLocationKey);
    setSelectedCountry(profile?.country || 'Libya');
    setSelectedCityId(profile?.city?.id ?? '');
  }

  const citiesForCountry = useMemo(() => {
    if (!selectedCountry || selectedCountry === 'Other') return [];
    return cities.filter((city) => (city.country ?? 'Libya') === selectedCountry);
  }, [cities, selectedCountry]);

  function handleCountryChange(country: string) {
    setSelectedCountry(country);
    setSelectedCityId('');
  }

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
        workMode: showPicker
          ? String(formData.get('workMode') ?? defaultWorkMode)
          : defaultWorkMode,
        professionalTitle: String(formData.get('professionalTitle') ?? ''),
        displayName: String(formData.get('displayName') ?? ''),
        presenceVisibility: String(formData.get('presenceVisibility') ?? 'EVERYONE'),
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
          onUploaded={(photoUrl) => {
            setProfilePhoto(photoUrl);
            updateProfilePhoto(photoUrl);
          }}
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
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full rounded-lg border px-3 py-2"
              >
                <option value="">{tProjects('choose')}</option>
                {PROFILE_COUNTRIES.map((country) => (
                  <option key={country.value} value={country.value}>
                    {locale === 'en' ? country.nameEn : country.nameAr}
                  </option>
                ))}
                {selectedCountry &&
                !PROFILE_COUNTRIES.some((c) => c.value === selectedCountry) ? (
                  <option value={selectedCountry}>{selectedCountry}</option>
                ) : null}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('city')}</label>
              <select
                name="cityId"
                value={selectedCityId}
                onChange={(e) => setSelectedCityId(e.target.value)}
                disabled={!selectedCountry || selectedCountry === 'Other'}
                className="w-full rounded-lg border px-3 py-2 disabled:bg-slate-50 disabled:opacity-70"
              >
                <option value="">{tProjects('choose')}</option>
                {citiesForCountry.map((city) => (
                  <option key={city.id} value={city.id}>{getLocalizedCityName(city, locale)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('workMode')}</label>
            {showPicker ? (
              <select name="workMode" defaultValue={profile.workMode} className="w-full rounded-lg border px-3 py-2">
                <option value="REMOTE">{tProjects('workModeRemote')}</option>
                <option value="ON_SITE">{tProjects('workModeOnSite')}</option>
                <option value="HYBRID">{tProjects('workModeHybrid')}</option>
              </select>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-palm/10 px-3 py-1.5 text-sm font-medium text-palm-deep">
                  {tProjects('workModeRemote')}
                </span>
                {!isEnabled(profile.workMode as WorkModeValue) ? (
                  <span className="text-xs text-on-surface-variant">
                    ({tProjects('workModePreferenceHint')})
                  </span>
                ) : null}
              </div>
            )}
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

          <div>
            <label className="mb-1 block text-sm font-medium">{t('presenceVisibility')}</label>
            <select
              name="presenceVisibility"
              defaultValue={profile.presenceVisibility ?? 'EVERYONE'}
              className="w-full rounded-lg border px-3 py-2"
            >
              <option value="EVERYONE">{t('presenceEveryone')}</option>
              <option value="CLIENTS_ONLY">{t('presenceClientsOnly')}</option>
              <option value="NOBODY">{t('presenceNobody')}</option>
            </select>
            <p className="mt-1 text-xs text-on-surface-variant">{t('presenceHint')}</p>
          </div>

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
                className="rounded-full bg-primary px-3 py-1 text-sm font-medium text-white"
              >
                {skill.name} ×
              </button>
            ))}
          </div>
          {skills.length === 0 ? (
            <p className="mt-2 text-sm text-on-surface-variant">{t('noSkillsYet')}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-2">
            {allSkills
              .filter((s) => !skills.some((ms) => ms.id === s.id))
              .map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  onClick={() => addSkill(skill.id)}
                  className="rounded-full border border-outline-variant px-3 py-1 text-sm text-on-surface"
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
