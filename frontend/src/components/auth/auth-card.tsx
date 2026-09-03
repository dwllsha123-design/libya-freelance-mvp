'use client';

import { useTranslations } from 'next-intl';
import { Logo } from '@/components/brand/logo';

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  const t = useTranslations('brand');

  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-line bg-surface p-8 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]">
      <div className="mb-8 text-center">
        <div className="flex justify-center">
          <Logo href="/" />
        </div>
        <p className="mt-2 text-xs text-ink-soft">{t('tagline')}</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink">{title}</h1>
        <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
      </div>
      {children}
      {footer ? (
        <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
      ) : null}
    </div>
  );
}

/** Shared auth field styles — readable in light and dark. */
export const authFieldClassName =
  'w-full rounded-xl border border-line bg-cream px-3 py-2.5 text-ink outline-none transition placeholder:text-ink-soft focus:border-ember focus:ring-2 focus:ring-ember/25';

export const authLabelClassName = 'mb-1.5 block text-sm font-medium text-ink';

export const authErrorClassName =
  'rounded-xl border border-error/25 bg-error/10 px-4 py-3 text-sm text-error';

export const authSubmitClassName =
  'w-full rounded-full bg-ember px-4 py-2.5 font-semibold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep disabled:opacity-60';

export const authLinkClassName = 'font-semibold text-ember hover:underline';
