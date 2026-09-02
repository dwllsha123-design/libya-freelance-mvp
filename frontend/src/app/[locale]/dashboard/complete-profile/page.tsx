'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { useAuth } from '@/contexts/auth-context';
import { useProfileData } from '@/hooks/use-profile';
import { apiRequest, type Category, type PublicProfile } from '@/lib/api';
import { getSafeNextPath } from '@/lib/auth-redirect';
import {
  markClientOnboardingSkipped,
  ORGANIZATION_SIZE_OPTIONS,
  type OrganizationSize,
} from '@/lib/client-onboarding';
import { getLocalizedCategoryName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';

const ORG_SIZE_KEYS: Record<OrganizationSize, string> = {
  SOLO: 'orgSizeSolo',
  '2-9': 'orgSize2to9',
  '10-99': 'orgSize10to99',
  '100-499': 'orgSize100to499',
  '500-4999': 'orgSize500to4999',
  '5000+': 'orgSize5000plus',
};

function CompleteProfileFields({
  profile,
  categories,
  nextPath,
  updateProfile,
}: {
  profile: PublicProfile;
  categories: Category[];
  nextPath: string | null;
  updateProfile: ReturnType<typeof useProfileData>['updateProfile'];
}) {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const router = useRouter();

  const [companyName, setCompanyName] = useState(profile.client?.displayName ?? '');
  const [companySector, setCompanySector] = useState(profile.client?.companySector ?? '');
  const [organizationSize, setOrganizationSize] = useState<OrganizationSize | ''>(
    (profile.client?.organizationSize as OrganizationSize | undefined) ?? '',
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const trimmedName = companyName.trim();
    if (trimmedName.length < 2) {
      setError(t('companyNameMin'));
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        displayName: trimmedName,
        ...(companySector ? { companySector } : {}),
        ...(organizationSize ? { organizationSize } : {}),
      });
      router.push(nextPath ?? '/dashboard');
    } catch {
      setError(t('saveFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    markClientOnboardingSkipped();
    router.push(nextPath ?? '/dashboard');
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-6xl flex-col px-4 py-8 lg:flex-row lg:items-stretch lg:gap-12 lg:py-12">
      <section className="flex flex-col justify-center lg:w-2/5 lg:py-8">
        <div className="mb-6 lg:hidden">
          <Logo href="/" />
        </div>
        <h1 className="text-3xl font-bold text-on-surface sm:text-4xl">
          {t('completeProfileTitle')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
          {t('completeProfileSubtitle')}
        </p>
      </section>

      <section className="mt-8 flex flex-1 flex-col lg:mt-0">
        <div className="flex flex-1 flex-col rounded-2xl border border-outline-variant/50 bg-surface p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold text-on-surface">
            {t('completeProfileFormTitle')}
          </h2>

          <form onSubmit={handleContinue} className="mt-6 flex flex-1 flex-col">
            {error ? (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <div className="space-y-5">
              <div>
                <label htmlFor="companyName" className="mb-2 block text-sm font-medium text-on-surface">
                  {t('companyName')}
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder={t('companyNamePlaceholder')}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                  maxLength={100}
                />
              </div>

              <div>
                <label htmlFor="companySector" className="mb-2 block text-sm font-medium text-on-surface">
                  {t('addCompanySector')}
                </label>
                <select
                  id="companySector"
                  value={companySector}
                  onChange={(e) => setCompanySector(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="">{t('chooseSector')}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.nameAr}>
                      {getLocalizedCategoryName(cat, locale)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-3 text-sm font-medium text-on-surface">
                  {t('orgSizeQuestion')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {ORGANIZATION_SIZE_OPTIONS.map((option) => {
                    const selected = organizationSize === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setOrganizationSize(option.value)}
                        className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {t(ORG_SIZE_KEYS[option.value])}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-6">
              <Link
                href="/register"
                className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
              >
                <span aria-hidden>→</span>
                {tCommon('back')}
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {t('skipForNow')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-container disabled:opacity-60"
                >
                  {isSubmitting ? tCommon('saving') : t('continue')}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function CompleteProfileForm() {
  const tCommon = useTranslations('common');
  const searchParams = useSearchParams();
  const nextPath = getSafeNextPath(searchParams.get('next'));
  const { user, isLoading: authLoading } = useAuth();
  const { profile, isLoading: profileLoading, updateProfile } = useProfileData();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!authLoading && user && user.role !== 'CLIENT') {
      router.replace('/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    apiRequest<Category[]>('/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center text-slate-500">
        {tCommon('loadingPage')}
      </div>
    );
  }

  if (!user || user.role !== 'CLIENT' || !profile) {
    return null;
  }

  return (
    <CompleteProfileFields
      key={profile.username}
      profile={profile}
      categories={categories}
      nextPath={nextPath}
      updateProfile={updateProfile}
    />
  );
}

export default function CompleteProfilePage() {
  const tCommon = useTranslations('common');

  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>}>
      <CompleteProfileForm />
    </Suspense>
  );
}
