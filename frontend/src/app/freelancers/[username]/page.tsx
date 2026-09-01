'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiRequest, type PublicPortfolioItem, type PublicProfile } from '@/lib/api';
import { BackLink } from '@/components/ui/back-link';
import { ProfileReviewsSection } from '@/components/rating/profile-reviews-section';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { FreelancerTrustStats } from '@/components/trust/freelancer-trust-stats';
import { isFreelancerVerified, VERIFICATION_CRITERIA_AR } from '@/lib/freelancer-trust';
import { formatCurrency } from '@/lib/currency';

function isSafeUrl(url: string) {
  return url.startsWith('http://') || url.startsWith('https://');
}

export default function FreelancerProfilePage() {
  const params = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [selectedItem, setSelectedItem] = useState<PublicPortfolioItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);

      try {
        const data = await apiRequest<PublicProfile>(
          `/freelancers/${params.username}`,
        );

        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setError('المستقل غير موجود');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [params.username]);

  if (isLoading) return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  if (error || !profile) return <div className="p-8 text-center text-red-600">{error}</div>;

  const portfolioItems = profile.portfolio?.items ?? [];
  const verified = isFreelancerVerified(profile);
  const rating = profile.freelancer?.averageRating ?? 0;
  const completed = profile.freelancer?.completedProjects ?? 0;
  const hourlyRate = profile.freelancer?.hourlyRate;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <BackLink href="/freelancers">العودة للمستقلين</BackLink>

      <div className="mt-6 rounded-2xl border border-outline-variant/40 bg-surface p-8 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {profile.profilePhoto ? (
            <Image
              src={profile.profilePhoto}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-surface-container"
            />
          ) : (
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-surface-container text-2xl font-bold text-secondary">
              {profile.firstName.charAt(0)}
              {profile.lastName.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-on-surface">
                {profile.firstName} {profile.lastName}
              </h1>
              {verified ? <VerifiedBadge className="!text-xs" /> : null}
            </div>
            <p className="mt-2 text-lg text-on-surface-variant">
              {profile.freelancer?.professionalTitle ?? 'مستقل'}
            </p>
            <p className="mt-1 text-sm text-on-surface-variant">
              {profile.city?.nameAr ?? '—'} · عضو منذ{' '}
              {new Date(profile.joinDate).toLocaleDateString('ar-LY', {
                year: 'numeric',
                month: 'long',
              })}
            </p>

            <div className="mt-4">
              <FreelancerTrustStats
                rating={rating}
                completedProjects={completed}
                reviewCount={profile.reviews?.reviewCount}
                size="md"
              />
            </div>

            {hourlyRate ? (
              <p className="mt-3 text-lg font-semibold text-primary">
                من {formatCurrency(hourlyRate)}/ساعة
              </p>
            ) : null}
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-6 leading-relaxed text-on-surface-variant">{profile.bio}</p>
        ) : null}

        {profile.freelancer?.skills?.length ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.freelancer.skills.map((skill) => (
              <span
                key={skill.id}
                className="rounded-full bg-surface-container-low px-3 py-1 text-sm text-on-surface"
              >
                {skill.name}
              </span>
            ))}
          </div>
        ) : null}

        {!verified ? (
          <div className="mt-6 rounded-xl border border-dashed border-outline-variant/60 bg-surface-container-low p-4 text-sm text-on-surface-variant">
            <p className="font-medium text-on-surface">كيف تحصل على شارة «موثّق»؟</p>
            <ul className="mt-2 list-disc space-y-1 ps-5">
              {VERIFICATION_CRITERIA_AR.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ProfileReviewsSection
        username={profile.username}
        role="freelancer"
        summary={profile.reviews}
      />

      <section className="mt-10">
        <h2 className="text-2xl font-bold text-on-surface">معرض الأعمال</h2>
        {portfolioItems.length === 0 ? (
          <p className="mt-4 text-slate-500">لا توجد أعمال معروضة بعد</p>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {portfolioItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedItem(item)}
                className="overflow-hidden rounded-xl border border-outline-variant/40 bg-surface text-right transition hover:shadow-md"
              >
                {item.coverImage ? (
                  <Image
                    src={item.coverImage}
                    alt={item.title}
                    width={500}
                    height={280}
                    className="h-44 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-surface-container text-sm text-on-surface-variant">
                    بدون صورة
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-on-surface">{item.title}</h3>
                  <p className="mt-1 line-clamp-2 text-sm text-on-surface-variant">
                    {item.description}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.skills.slice(0, 3).map((skill) => (
                      <span key={skill.id} className="text-xs text-primary">
                        {skill.name}
                      </span>
                    ))}
                  </div>
                  {item.completedAt ? (
                    <p className="mt-2 text-xs text-on-surface-variant">
                      {new Date(item.completedAt).toLocaleDateString('ar-LY')}
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-surface p-6">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-bold text-on-surface">{selectedItem.title}</h3>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-on-surface-variant"
              >
                إغلاق
              </button>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-on-surface-variant">
              {selectedItem.description}
            </p>
            {selectedItem.images.length ? (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {selectedItem.images.map((image) => (
                  <Image
                    key={image.id}
                    src={image.imageUrl}
                    alt=""
                    width={400}
                    height={300}
                    className="h-40 w-full rounded-lg object-cover"
                  />
                ))}
              </div>
            ) : null}
            {selectedItem.projectUrl && isSafeUrl(selectedItem.projectUrl) ? (
              <a
                href={selectedItem.projectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block text-sm text-primary"
              >
                زيارة المشروع
              </a>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
