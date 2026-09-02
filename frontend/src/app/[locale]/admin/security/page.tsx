'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type AdminDashboardOverview } from '@/hooks/use-admin';
import {
  AdminKpiCard,
  AdminPageHeader,
  AdminPanel,
} from '@/components/admin/admin-layout-ui';

export default function AdminSecurityPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [stats, setStats] = useState<AdminDashboardOverview | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.dashboard().then((d) => {
      if (!cancelled) setStats(d);
    });
    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t('securityCenter')} subtitle={t('securityCenterSubtitle')} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <AdminKpiCard
          label={t('alertSuspendedUsers', { count: stats?.users.suspended ?? 0 })}
          value={stats?.users.suspended ?? '—'}
          href="/admin/users?status=SUSPENDED"
        />
        <AdminKpiCard
          label={t('alertBannedUsers', { count: stats?.users.banned ?? 0 })}
          value={stats?.users.banned ?? '—'}
          href="/admin/users?status=BANNED"
        />
        <AdminKpiCard label={t('sessionsRevokedNote')} value="—" hint={t('sessionsRevokedHint')} />
      </div>

      <AdminPanel
        title={t('recentSecurityActions')}
        action={
          <Link href="/admin/audit" className="text-xs text-primary">
            {t('viewAll')}
          </Link>
        }
      >
        <ul className="divide-y text-sm">
          {(stats?.recent.audit ?? [])
            .filter((a) => /USER_|SESSION|BAN|SUSPEND/i.test(a.action))
            .map((a) => (
              <li key={a.id} className="py-2.5">
                <p className="font-medium">{a.action}</p>
                <p className="text-xs text-slate-500">
                  {a.actorEmail} · {new Date(a.createdAt).toLocaleString('ar-LY')}
                </p>
              </li>
            ))}
          {!stats?.recent.audit?.length ? (
            <li className="py-6 text-center text-slate-400">{t('noAudit')}</li>
          ) : null}
        </ul>
      </AdminPanel>
      <p className="text-xs text-slate-500">{t('securitySafeNote')}</p>
    </div>
  );
}
