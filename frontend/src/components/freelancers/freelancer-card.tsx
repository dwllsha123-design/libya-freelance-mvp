'use client';

import Image from 'next/image';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { PublicProfile } from '@/lib/api';
import { getLocalizedCityName } from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import { publicProfilePath } from '@/lib/profile-url';
import { IdentityVerifiedBadge } from '@/components/trust/identity-pro-badges';
import { PresenceDot } from '@/components/presence/presence-indicator';
import { usePresenceStore } from '@/hooks/use-presence';

const SKILL_PREVIEW = 3;

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function workModeLabel(
  workMode: string | undefined,
  t: (key: string) => string,
): string | null {
  if (workMode === 'REMOTE') return t('workModeRemoteShort');
  if (workMode === 'ON_SITE') return t('workModeOnSiteShort');
  if (workMode === 'HYBRID') return t('workModeHybridShort');
  return null;
}

export function FreelancerCard({
  freelancer,
  variant = 'default',
}: {
  freelancer: PublicProfile;
  variant?: 'default' | 'carousel';
}) {
  const t = useTranslations('freelancers');
  const locale = useLocale() as AppLocale;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const rating = freelancer.freelancer?.averageRating ?? 0;
  const completed = freelancer.freelancer?.completedProjects ?? 0;
  const allSkills = freelancer.freelancer?.skills ?? [];
  const skills = allSkills.slice(0, SKILL_PREVIEW);
  const extraSkills = Math.max(0, allSkills.length - SKILL_PREVIEW);
  // Discovery badge = identity KYC only (not soft profile-completeness "موثّق").
  const identityVerified = Boolean(freelancer.freelancer?.identityVerified);
  const reviewCount = freelancer.reviews?.reviewCount ?? 0;
  const { getPresence } = usePresenceStore();
  const presence =
    (freelancer.userId ? getPresence(freelancer.userId) : null) ??
    freelancer.presence ??
    null;
  const mode = workModeLabel(freelancer.workMode, t);
  const title = freelancer.freelancer?.professionalTitle ?? t('defaultTitle');
  const location = freelancer.city
    ? getLocalizedCityName(freelancer.city, locale)
    : null;
  const profileHref = publicProfilePath(freelancer.username);

  if (!profileHref) {
    return null;
  }

  return (
    <Link
      href={profileHref}
      className={`group flex h-full flex-col rounded-2xl border border-line bg-cream p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ember/40 hover:shadow-[0_18px_40px_-24px_rgba(29,24,17,0.35)] ${
        variant === 'carousel' ? 'w-full' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          {freelancer.profilePhoto ? (
            <Image
              src={freelancer.profilePhoto}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-cream-deep"
            />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-secondary">
              {initials(freelancer.firstName, freelancer.lastName)}
            </span>
          )}
          {presence ? (
            <span className="absolute bottom-0 end-0">
              <PresenceDot presence={presence} className="ring-cream" />
            </span>
          ) : null}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="font-semibold text-ink group-hover:text-ember">
              {freelancer.firstName} {freelancer.lastName}
            </h3>
            {identityVerified ? <IdentityVerifiedBadge /> : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-ink-soft">
            {title}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
        <span className="inline-flex items-center gap-1 font-semibold text-ink">
          <span aria-hidden className="text-ember">
            ★
          </span>
          {rating.toFixed(1)}
          {reviewCount > 0 ? (
            <span className="font-normal text-ink-soft">
              ({t('reviewCountShort', { count: reviewCount.toLocaleString(numberLocale) })})
            </span>
          ) : null}
        </span>
        <span>
          {t('completedJobsShort', {
            count: completed.toLocaleString(numberLocale),
          })}
        </span>
      </div>

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className="rounded-md bg-surface-container-low px-2 py-0.5 text-[11px] font-medium text-ink-soft"
            >
              {skill.name}
            </span>
          ))}
          {extraSkills > 0 ? (
            <span className="rounded-md bg-ember/10 px-2 py-0.5 text-[11px] font-semibold text-ember">
              +{extraSkills}
            </span>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 min-h-[1.5rem]" />
      )}

      {(location || mode) && (
        <p className="mt-auto pt-3 text-xs text-ink-soft">
          {[location, mode].filter(Boolean).join(' · ')}
        </p>
      )}
    </Link>
  );
}
