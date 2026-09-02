'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { apiRequest, type PublicProfile } from '@/lib/api';
import { ProfileReviewsSection } from '@/components/rating/profile-reviews-section';
import { RatingSummary } from '@/components/rating/review-card';
import { getLocalizedCityName } from '@/lib/locale-content';
import { getCityBySlug } from '@/lib/marketplace-content';
import type { AppLocale } from '@/i18n/routing';

export default function ClientProfilePage() {
  const params = useParams<{ username: string }>();
  const t = useTranslations('profile');
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await apiRequest<PublicProfile>(`/clients/${params.username}`);
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError(t('clientNotFound'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.username, t]);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">{tCommon('loadingPage')}</div>;
  }

  if (error || !profile) {
    return <div className="p-8 text-center text-red-600">{error ?? t('clientNotFound')}</div>;
  }

  const cityRecord = profile.city ? getCityBySlug(profile.city.slug) : null;
  const cityName = cityRecord
    ? getLocalizedCityName(cityRecord, locale)
    : profile.city?.nameAr ?? '—';

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">
        {profile.client?.displayName ?? `${profile.firstName} ${profile.lastName}`}
      </h1>
      <p className="mt-2 text-slate-600">@{profile.username}</p>
      {profile.bio ? <p className="mt-6 text-slate-700">{profile.bio}</p> : null}
      <p className="mt-4 text-sm text-slate-500">
        {cityName} · {t('projectsPosted', { count: profile.client?.projectsPosted ?? 0 })}
      </p>
      {profile.reviews && profile.reviews.reviewCount > 0 ? (
        <div className="mt-2">
          <RatingSummary
            average={profile.reviews.ratingAverage}
            count={profile.reviews.reviewCount}
          />
        </div>
      ) : null}

      <ProfileReviewsSection
        username={profile.username}
        role="client"
        summary={profile.reviews}
      />

      <Link href="/" className="mt-8 inline-block text-primary">
        {tNav('home')}
      </Link>
    </div>
  );
}
