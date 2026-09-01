import Image from 'next/image';
import Link from 'next/link';
import type { PublicProfile } from '@/lib/api';
import { formatCurrency } from '@/lib/currency';
import { isFreelancerVerified } from '@/lib/freelancer-trust';
import { VerifiedBadge } from '@/components/trust/verified-badge';
import { FreelancerTrustStats } from '@/components/trust/freelancer-trust-stats';

function initials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

export function FreelancerCard({
  freelancer,
  variant = 'default',
}: {
  freelancer: PublicProfile;
  variant?: 'default' | 'carousel';
}) {
  const rating = freelancer.freelancer?.averageRating ?? 0;
  const completed = freelancer.freelancer?.completedProjects ?? 0;
  const skills = freelancer.freelancer?.skills?.slice(0, 3) ?? [];
  const hourlyRate = freelancer.freelancer?.hourlyRate;
  const verified = isFreelancerVerified(freelancer);
  const reviewCount = freelancer.reviews?.reviewCount;

  return (
    <Link
      href={`/freelancers/${freelancer.username}`}
      className={`flex h-full flex-col rounded-xl border border-outline-variant/40 bg-surface shadow-sm transition hover:border-primary/40 hover:shadow-md ${
        variant === 'carousel' ? 'w-full p-5' : 'p-6'
      }`}
    >
      <div className="flex items-start gap-3">
        {freelancer.profilePhoto ? (
          <Image
            src={freelancer.profilePhoto}
            alt=""
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-surface-container"
          />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-container text-sm font-bold text-secondary">
            {initials(freelancer.firstName, freelancer.lastName)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate font-semibold text-on-surface">
              {freelancer.firstName} {freelancer.lastName}
            </h3>
            {verified ? <VerifiedBadge /> : null}
          </div>
          <p className="truncate text-sm text-on-surface-variant">
            {freelancer.freelancer?.professionalTitle ?? 'مستقل'}
          </p>
          {freelancer.city ? (
            <p className="mt-1 text-xs text-on-surface-variant">📍 {freelancer.city.nameAr}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4">
        <FreelancerTrustStats
          rating={rating}
          completedProjects={completed}
          reviewCount={reviewCount}
          size={variant === 'carousel' ? 'md' : 'sm'}
        />
      </div>

      {hourlyRate ? (
        <p className="mt-3 text-sm font-semibold text-primary">
          من {formatCurrency(hourlyRate)}/ساعة
        </p>
      ) : null}

      {skills.length ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill.id}
              className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-xs text-on-surface-variant"
            >
              {skill.name}
            </span>
          ))}
        </div>
      ) : null}
    </Link>
  );
}
