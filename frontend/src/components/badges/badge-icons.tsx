'use client';

import type { PerformanceLevel } from '@/lib/badges';

const sizeMap = {
  sm: 'h-5 w-5',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
} as const;

export function RisingBadgeIcon({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <svg viewBox="0 0 48 48" className={`${sizeMap[size]} ${className}`} aria-hidden>
      <defs>
        <linearGradient id="lf-rising" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#lf-rising)" opacity="0.15" />
      <path
        d="M12 32c4-8 8-12 12-14 4 2 8 6 12 14"
        fill="none"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d="M28 14h8v8" fill="none" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
      <path d="M36 14 24 26" stroke="#EA580C" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function ProvenBadgeIcon({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <svg viewBox="0 0 48 48" className={`${sizeMap[size]} ${className}`} aria-hidden>
      <path
        d="M24 4 40 14v16L24 44 8 30V14Z"
        fill="#1E3A8A"
        opacity="0.12"
        stroke="#1E3A8A"
        strokeWidth="2.5"
      />
      <path
        d="M16 24.5 21.5 30 33 18"
        fill="none"
        stroke="#1E3A8A"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TopPerformerBadgeIcon({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <svg viewBox="0 0 48 48" className={`${sizeMap[size]} ${className}`} aria-hidden>
      <circle cx="24" cy="24" r="18" fill="#EA580C" opacity="0.12" stroke="#EA580C" strokeWidth="2.5" />
      <path
        d="M24 12l3.2 7.4L35 21l-5.5 5.1L31.4 34 24 29.8 16.6 34l1.9-7.9L13 21l7.8-1.6Z"
        fill="#EA580C"
      />
    </svg>
  );
}

export function EliteBadgeIcon({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <svg viewBox="0 0 48 48" className={`${sizeMap[size]} ${className}`} aria-hidden>
      <path
        d="M24 6 30 18l12 2-9 8 2.5 12L24 34l-11.5 6 2.5-12-9-8 12-2Z"
        fill="#0F172A"
        opacity="0.08"
      />
      <path
        d="M24 10 28.5 20.5 40 22.2 31.5 29.5 34 40.5 24 34.8 14 40.5l2.5-11L8 22.2l11.5-1.7Z"
        fill="none"
        stroke="#0F172A"
        strokeWidth="2.2"
      />
      <circle cx="24" cy="24" r="4" fill="#EA580C" />
    </svg>
  );
}

export function VerifiedTalentBadgeIcon({
  className = '',
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <svg viewBox="0 0 48 48" className={`${sizeMap[size]} ${className}`} aria-hidden>
      <path
        d="M24 6c6 4 10 4 14 4v12c0 10-8 16-14 20-6-4-14-10-14-20V10c4 0 8 0 14-4Z"
        fill="#059669"
        opacity="0.12"
        stroke="#059669"
        strokeWidth="2.5"
      />
      <path
        d="M16 23.5 21.5 29 33 17"
        fill="none"
        stroke="#059669"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PerformanceBadgeIcon({
  level,
  className = '',
  size = 'md',
}: {
  level: PerformanceLevel | 'VERIFIED_TALENT';
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  switch (level) {
    case 'RISING':
      return <RisingBadgeIcon className={className} size={size} />;
    case 'PROVEN':
      return <ProvenBadgeIcon className={className} size={size} />;
    case 'TOP_PERFORMER':
      return <TopPerformerBadgeIcon className={className} size={size} />;
    case 'ELITE':
      return <EliteBadgeIcon className={className} size={size} />;
    case 'VERIFIED_TALENT':
      return <VerifiedTalentBadgeIcon className={className} size={size} />;
    default:
      return null;
  }
}
