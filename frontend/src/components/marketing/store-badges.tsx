'use client';

import type { AppLocale } from '@/i18n/routing';

export type StoreAppStatus = 'COMING_SOON' | 'BETA' | 'AVAILABLE' | 'MAINTENANCE';

export interface PublicAppConfig {
  iosAppStatus: StoreAppStatus;
  androidAppStatus: StoreAppStatus;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  featureFlags?: Record<string, boolean>;
}

function AppleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.6.8-3.2.8-.7 0-1.8-.8-3-.7-1.5 0-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .8 1.1 1.7 2.3 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.3-2.5 1.3-2.6-.1 0-2.5-1-2.5-3.8zM14.6 6.2c.6-.8 1.1-1.8 1-2.9-1 .1-2.2.7-2.9 1.5-.6.7-1.2 1.8-1 2.8 1.1.1 2.2-.5 2.9-1.4z" />
    </svg>
  );
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M4.5 3.1c-.4.2-.7.6-.7 1.1v15.6c0 .5.3.9.7 1.1l9.8-8.9L4.5 3.1zm11.2 6.1-2.2 2 2.2 2 3.9-2.2c.7-.4.7-1.4 0-1.8l-3.9-2zM5.3 20.9l8.2-7.4-2.2-2-6 9.4zm8.2-10.4 2.2-2L5.3 3.1l6 9.4z" />
    </svg>
  );
}

type StoreKind = 'ios' | 'android';

function statusLabel(status: StoreAppStatus, locale: AppLocale) {
  if (locale === 'ar') {
    if (status === 'COMING_SOON') return 'قريبًا';
    if (status === 'BETA') return 'تجريبي';
    if (status === 'MAINTENANCE') return 'صيانة';
    return 'متاح';
  }
  if (status === 'COMING_SOON') return 'Coming soon';
  if (status === 'BETA') return 'Beta';
  if (status === 'MAINTENANCE') return 'Maintenance';
  return 'Available';
}

function storeTitle(kind: StoreKind) {
  return kind === 'ios' ? 'App Store' : 'Google Play';
}

function StoreBadge({
  kind,
  status,
  href,
  locale,
  compact,
}: {
  kind: StoreKind;
  status: StoreAppStatus;
  href: string | null;
  locale: AppLocale;
  compact?: boolean;
}) {
  const title = storeTitle(kind);
  const badge = statusLabel(status, locale);
  const canLink =
    (status === 'AVAILABLE' || status === 'BETA') && Boolean(href);
  const aria =
    locale === 'ar'
      ? `تطبيق Libya Freelance على ${title} — ${badge}`
      : `Libya Freelance on ${title} — ${badge}`;

  const Icon = kind === 'ios' ? AppleIcon : PlayIcon;
  const className = compact
    ? 'inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white'
    : 'inline-flex min-w-[11rem] items-center gap-3 rounded-2xl border border-outline-variant/50 bg-on-surface px-4 py-3 text-white shadow-sm';

  const inner = (
    <>
      <Icon className={compact ? 'h-5 w-5' : 'h-8 w-8'} />
      <span className="text-start leading-tight">
        <span className={`block font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
          {title}
        </span>
        <span
          className={`block ${compact ? 'text-[11px] text-slate-300' : 'text-xs text-white/80'}`}
        >
          {badge}
        </span>
      </span>
    </>
  );

  if (canLink && href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={aria}
        className={`${className} transition hover:opacity-95`}
      >
        {inner}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled
      aria-label={aria}
      className={`${className} cursor-not-allowed opacity-90`}
    >
      {inner}
    </button>
  );
}

export function StoreBadgePair({
  config,
  locale,
  compact,
  className = '',
}: {
  config: PublicAppConfig | null;
  locale: AppLocale;
  compact?: boolean;
  className?: string;
}) {
  const iosStatus = config?.iosAppStatus ?? 'COMING_SOON';
  const androidStatus = config?.androidAppStatus ?? 'COMING_SOON';

  return (
    <div
      className={`flex flex-wrap items-center gap-3 ${className}`}
      role="group"
      aria-label={
        locale === 'ar' ? 'تطبيقات Libya Freelance' : 'Libya Freelance apps'
      }
    >
      <StoreBadge
        kind="ios"
        status={iosStatus}
        href={config?.iosStoreUrl ?? null}
        locale={locale}
        compact={compact}
      />
      <StoreBadge
        kind="android"
        status={androidStatus}
        href={config?.androidStoreUrl ?? null}
        locale={locale}
        compact={compact}
      />
    </div>
  );
}
