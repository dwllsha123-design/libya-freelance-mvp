'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAdminApi, type AdminBanner } from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminConfirmDialog, AdminEmptyState } from '@/components/admin/admin-ui';
import { StatusBadge } from '@/components/admin/status-badge';

function toDateInput(value: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

export default function AdminBannersPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [rows, setRows] = useState<AdminBanner[] | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [isActive, setIsActive] = useState(false);

  async function reload() {
    const data = await api.listBanners();
    setRows(data);
  }

  useEffect(() => {
    let cancelled = false;
    api
      .listBanners()
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('bannersLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBanner({
        text: text.trim(),
        link: link.trim() || null,
        startsAt: start ? new Date(start).toISOString() : null,
        endsAt: end ? new Date(end).toISOString() : null,
        isActive,
      });
      setText('');
      setLink('');
      setStart('');
      setEnd('');
      setIsActive(false);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bannersSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(row: AdminBanner) {
    setSaving(true);
    setError('');
    try {
      await api.updateBanner(row.id, { isActive: !row.isActive });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bannersSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      await api.deleteBanner(deleteId);
      setDeleteId(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bannersSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('announcementBanners')}
        subtitle={t('announcementBannersSubtitle')}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('bannerPreview')}>
        <div className="mb-4 rounded-xl bg-on-surface px-4 py-3 text-center text-sm text-white">
          {text || t('bannerPreviewEmpty')}
        </div>
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className="mb-1 block">{t('bannerText')}</span>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('bannerLink')}</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder={t('optional')}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>{t('bannerPublishNow')}</span>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('effectiveFrom')}</span>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('effectiveTo')}</span>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2"
          >
            {saving ? t('loading') : t('createBanner')}
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title={t('bannersList')}>
        {!rows ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : !rows.length ? (
          <AdminEmptyState message={t('noBanners')} />
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{row.text}</p>
                    <StatusBadge
                      label={row.isActive ? t('active') : t('inactive')}
                      tone={row.isActive ? 'success' : 'neutral'}
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {row.link || t('optional')} · {toDateInput(row.startsAt) || '—'} →{' '}
                    {toDateInput(row.endsAt) || '—'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void toggleActive(row)}
                    className="rounded-lg border px-3 py-1.5 text-sm"
                  >
                    {row.isActive ? t('deactivate') : t('activate')}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setDeleteId(row.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-600"
                  >
                    {t('deleteBanner')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>

      <AdminConfirmDialog
        open={deleteId !== null}
        title={t('deleteBanner')}
        message={t('deleteBannerConfirm')}
        confirmLabel={t('deleteBanner')}
        isLoading={saving}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
