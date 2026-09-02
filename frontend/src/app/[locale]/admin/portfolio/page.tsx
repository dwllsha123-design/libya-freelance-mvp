'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useAdminApi,
  type AdminPortfolioItem,
  type Paginated,
} from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import {
  AdminEmptyState,
  AdminPagination,
  AdminSearch,
} from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';

export default function AdminPortfolioModerationPage() {
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const api = useAdminApi();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [data, setData] = useState<Paginated<AdminPortfolioItem> | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState<{
    id: string;
    action: 'hide' | 'restore';
  } | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  async function reload() {
    const result = await api.listPortfolio({
      page: String(page),
      limit: '20',
      q: q.trim() || undefined,
      hiddenOnly: hiddenOnly ? 'true' : undefined,
    });
    setData(result);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .listPortfolio({
        page: String(page),
        limit: '20',
        q: q.trim() || undefined,
        hiddenOnly: hiddenOnly ? 'true' : undefined,
      })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('portfolioLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, page, q, hiddenOnly, t]);

  async function confirm() {
    if (!pending || reason.trim().length < 3) return;
    setSaving(true);
    setError('');
    try {
      if (pending.action === 'hide') {
        await api.hidePortfolio(pending.id, reason.trim());
      } else {
        await api.restorePortfolio(pending.id, reason.trim());
      }
      setPending(null);
      setReason('');
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('portfolioLoadFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('portfolioModeration')}
        subtitle={t('portfolioModerationSubtitle')}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <AdminSearch
          value={q}
          onChange={(v) => {
            setPage(1);
            setQ(v);
          }}
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={hiddenOnly}
            onChange={(e) => {
              setPage(1);
              setHiddenOnly(e.target.checked);
            }}
          />
          {t('hiddenOnly')}
        </label>
      </div>

      <AdminPanel>
        {!data?.items.length ? (
          <AdminEmptyState message={t('noPortfolioItems')} />
        ) : (
          <div className="space-y-3">
            {data.items.map((item) => {
              const profile = item.freelancerProfile.profile;
              const name = `${profile.firstName} ${profile.lastName}`.trim();
              return (
                <div key={item.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {name} · @{profile.username ?? '—'} · {profile.user.email}
                      </p>
                      {item.description ? (
                        <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                          {item.description}
                        </p>
                      ) : null}
                      {item.moderationReason ? (
                        <p className="mt-2 text-xs text-amber-700">
                          {t('moderationReason')}: {item.moderationReason}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge
                      label={item.isVisible ? t('visible') : t('hidden')}
                      tone={item.isVisible ? 'success' : 'danger'}
                    />
                  </div>
                  <div className="mt-3">
                    {item.isVisible ? (
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        onClick={() => {
                          setReason('');
                          setPending({ id: item.id, action: 'hide' });
                        }}
                      >
                        {t('hidePortfolio')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="text-sm text-primary"
                        onClick={() => {
                          setReason('');
                          setPending({ id: item.id, action: 'restore' });
                        }}
                      >
                        {t('restorePortfolio')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {data ? (
          <AdminPagination page={page} totalPages={data.totalPages} onChange={setPage} />
        ) : null}
      </AdminPanel>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label={tCommon('close')}
            onClick={() => {
              setPending(null);
              setReason('');
            }}
          />
          <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-on-surface">
              {pending.action === 'hide' ? t('hidePortfolio') : t('restorePortfolio')}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{t('portfolioReasonRequired')}</p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block font-medium">{t('moderationReason')}</span>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                minLength={3}
                autoFocus
              />
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setPending(null);
                  setReason('');
                }}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="button"
                disabled={saving || reason.trim().length < 3}
                onClick={() => void confirm()}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? tCommon('processing') : t('confirmToggle')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
