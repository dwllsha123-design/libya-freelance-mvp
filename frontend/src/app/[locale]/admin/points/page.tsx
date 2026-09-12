'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

/** Minimal points admin hub — package CRUD lives on /admin/point-packages. */
export default function AdminPointsPage() {
  const t = useTranslations('admin');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('pointsAdmin')}</h1>
        <p className="text-sm text-on-surface-variant">{t('pointsAdminHint')}</p>
      </div>
      <div className="space-y-3 rounded-xl border bg-white p-5 text-sm">
        <p>{t('pointsAdminBody')}</p>
        <Link href="/admin/point-packages" className="font-semibold text-primary underline">
          {t('pointPackages')}
        </Link>
      </div>
    </div>
  );
}
