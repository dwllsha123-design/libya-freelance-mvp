'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { StatusBadge } from '@/components/admin/status-badge';
type HealthTone = 'success' | 'warning' | 'danger' | 'neutral';

function toneFrom(status: string): HealthTone {
  if (status === 'Healthy') return 'success';
  if (status === 'Degraded') return 'warning';
  if (status === 'Unavailable') return 'danger';
  return 'neutral';
}

function apiRoot() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
  return raw.replace(/\/api\/?$/, '');
}

export default function AdminSystemPage() {
  const t = useTranslations('admin');
  const [apiStatus, setApiStatus] = useState('—');
  const [dbStatus, setDbStatus] = useState('—');
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = apiRoot();

    async function ping() {
      try {
        const healthRes = await fetch(`${base}/api/health`, { cache: 'no-store' });
        if (!cancelled) setApiStatus(healthRes.ok ? 'Healthy' : 'Degraded');
      } catch {
        if (!cancelled) setApiStatus('Unavailable');
      }

      try {
        const readyRes = await fetch(`${base}/api/health/ready`, { cache: 'no-store' });
        if (!cancelled) setDbStatus(readyRes.ok ? 'Healthy' : 'Unavailable');
      } catch {
        if (!cancelled) setDbStatus('Unavailable');
      }

      if (!cancelled) setCheckedAt(new Date().toISOString());
    }

    void ping();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = [
    { label: t('healthApi'), status: apiStatus },
    { label: t('healthDatabase'), status: dbStatus },
    { label: t('healthStorage'), status: t('healthNotInstrumented') },
    { label: t('healthSocket'), status: t('healthNotInstrumented') },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('systemHealth')} subtitle={t('systemHealthSubtitle')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <AdminPanel key={card.label}>
            <p className="text-sm text-slate-500">{card.label}</p>
            <div className="mt-3">
              <StatusBadge label={card.status} tone={toneFrom(card.status)} />
            </div>
          </AdminPanel>
        ))}
      </div>
      <AdminPanel title={t('applicationInfo')}>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{t('environment')}:</strong> {process.env.NODE_ENV}
          </p>
          <p>
            <strong>{t('lastHealthCheck')}:</strong>{' '}
            {checkedAt ? new Date(checkedAt).toLocaleString('ar-LY') : '—'}
          </p>
          <p className="text-xs text-slate-500">{t('systemSecretsHidden')}</p>
        </div>
      </AdminPanel>
    </div>
  );
}
