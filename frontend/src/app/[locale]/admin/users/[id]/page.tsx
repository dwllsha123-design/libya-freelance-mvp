'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { AdminConfirmDialog } from '@/components/admin/admin-ui';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';
import type { AppLocale } from '@/i18n/routing';

export default function AdminUserDetailPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const params = useParams<{ id: string }>();
  const api = useAdminApi();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState<
    'suspend' | 'ban' | 'reactivate' | 'revokeSessions' | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const dateLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  useEffect(() => {
    let cancelled = false;
    api.user(params.id).then((data) => {
      if (!cancelled) setUser(data);
    });
    return () => {
      cancelled = true;
    };
  }, [api, params.id]);

  async function runAction() {
    if (!pending) return;
    setIsLoading(true);
    try {
      if (pending === 'suspend') await api.suspendUser(params.id);
      if (pending === 'ban') await api.banUser(params.id);
      if (pending === 'reactivate') await api.reactivateUser(params.id);
      if (pending === 'revokeSessions') await api.revokeUserSessions(params.id);
      const updated = await api.user(params.id);
      setUser(updated);
      setPending(null);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;

  const freelancer = user.freelancer as Record<string, unknown> | null;
  const client = user.client as Record<string, unknown> | null;

  const pendingTitle =
    pending === 'ban'
      ? t('banTitle')
      : pending === 'suspend'
        ? t('suspendTitle')
        : pending === 'revokeSessions'
          ? t('revokeSessionsTitle')
          : t('reactivateTitle');

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={String(user.displayName ?? user.email)}
        breadcrumb={
          <Link href="/admin/users" className="hover:text-primary">
            {t('users')}
          </Link>
        }
        actions={
          <StatusBadge label={String(user.status)} tone={userStatusTone(String(user.status))} />
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminPanel title={t('accountInfo')}>
          <div className="space-y-2 text-sm">
            <p>{t('userEmail', { email: String(user.email) })}</p>
            <p>{t('userUsername', { username: String(user.username ?? '—') })}</p>
            <p>{t('userRole', { role: String(user.role) })}</p>
            <p>
              {t('userJoined', {
                date: new Date(String(user.createdAt)).toLocaleDateString(dateLocale),
              })}
            </p>
            <p className="text-xs text-slate-500">{t('securitySafeNote')}</p>
          </div>
        </AdminPanel>

        <AdminPanel title={t('profileInfo')}>
          <div className="space-y-2 text-sm">
            {user.bio ? <p>{String(user.bio)}</p> : <p className="text-slate-400">—</p>}
            {user.city ? (
              <p>
                {t('city')}:{' '}
                {String((user.city as { nameAr?: string }).nameAr ?? '—')}
              </p>
            ) : null}
            {freelancer ? (
              <>
                <p>
                  {t('completedProjects')}: {String(freelancer.completedProjects)}
                </p>
                <p>
                  {t('rating')}: {String(freelancer.averageRating)}
                </p>
                <p>
                  {t('portfolioCount')}: {String(freelancer.portfolioCount)}
                </p>
              </>
            ) : null}
            {client ? (
              <>
                <p>
                  {t('projectsPosted')}: {String(client.projectsPosted)}
                </p>
                <p>
                  {t('rating')}: {String(client.averageRating)}
                </p>
              </>
            ) : null}
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title={t('adminActions')}>
        <div className="flex flex-wrap gap-2">
          {user.status !== 'SUSPENDED' ? (
            <button
              type="button"
              onClick={() => setPending('suspend')}
              className="rounded-xl border px-4 py-2 text-sm"
            >
              {t('suspendAccount')}
            </button>
          ) : null}
          {user.status !== 'BANNED' ? (
            <button
              type="button"
              onClick={() => setPending('ban')}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm text-red-600"
            >
              {t('banAccount')}
            </button>
          ) : null}
          {user.status !== 'ACTIVE' ? (
            <button
              type="button"
              onClick={() => setPending('reactivate')}
              className="rounded-xl bg-primary px-4 py-2 text-sm text-white"
            >
              {t('reactivateAccount')}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPending('revokeSessions')}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            {t('revokeSessions')}
          </button>
        </div>
      </AdminPanel>

      <AdminConfirmDialog
        open={pending !== null}
        title={pendingTitle}
        message={t('confirmAction')}
        confirmLabel={tCommon('confirm')}
        isLoading={isLoading}
        onConfirm={() => void runAction()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
