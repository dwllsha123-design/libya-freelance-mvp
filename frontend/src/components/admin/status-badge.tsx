'use client';

import type { AppLocale } from '@/i18n/routing';
import arAdmin from '../../../messages/ar/admin.json';
import enAdmin from '../../../messages/en/admin.json';

export function StatusBadge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'info';
}) {
  const tones = {
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-800',
    danger: 'bg-red-50 text-red-700',
    neutral: 'bg-slate-100 text-slate-700',
    info: 'bg-blue-50 text-blue-700',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {label}
    </span>
  );
}

export function userStatusTone(status: string) {
  if (status === 'ACTIVE') return 'success' as const;
  if (status === 'SUSPENDED') return 'warning' as const;
  if (status === 'BANNED') return 'danger' as const;
  return 'neutral' as const;
}

export function projectStatusLabel(status: string, locale: AppLocale = 'ar') {
  const labels = locale === 'en' ? enAdmin.projectStatus : arAdmin.projectStatus;
  return labels[status as keyof typeof labels] ?? status;
}

export function disputeStatusLabel(status: string, locale: AppLocale = 'ar') {
  const labels = locale === 'en' ? enAdmin.disputeStatus : arAdmin.disputeStatus;
  return labels[status as keyof typeof labels] ?? status;
}
