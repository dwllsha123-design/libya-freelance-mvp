'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  useAdminApi,
  type AdminBroadcastItem,
  type BroadcastAudience,
} from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';
import { AdminConfirmDialog } from '@/components/admin/admin-ui';

const AUDIENCES: BroadcastAudience[] = [
  'ALL',
  'CLIENTS',
  'FREELANCERS',
  'INVESTORS',
  'SPECIFIC_USER',
];

const AUDIENCE_I18N: Record<BroadcastAudience, string> = {
  ALL: 'all',
  CLIENTS: 'clients',
  FREELANCERS: 'freelancers',
  INVESTORS: 'investors',
  SPECIFIC_USER: 'user',
};

export default function AdminNotificationsPage() {
  const t = useTranslations('admin');
  const locale = useLocale();
  const api = useAdminApi();
  const [audience, setAudience] = useState<BroadcastAudience>('ALL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [specificUserId, setSpecificUserId] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [history, setHistory] = useState<AdminBroadcastItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalNotifications: number;
    readRate: number;
    pushDeliveryRate: number;
    emailDeliveryRate: number;
    failed: number;
  } | null>(null);

  const refreshHistory = useCallback(() => {
    setHistoryLoading(true);
    return api
      .listBroadcasts(20)
      .then(setHistory)
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    api
      .listBroadcasts(20)
      .then((items) => {
        if (!cancelled) setHistory(items);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    api
      .notificationStats(30)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  useEffect(() => {
    let cancelled = false;
    if (audience === 'SPECIFIC_USER' && !specificUserId.trim()) {
      const timer = window.setTimeout(() => {
        if (!cancelled) setRecipientCount(null);
      }, 0);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }
    api
      .previewBroadcast({
        audience,
        specificUserId: audience === 'SPECIFIC_USER' ? specificUserId.trim() : undefined,
      })
      .then((res) => {
        if (!cancelled) setRecipientCount(res.recipientCount);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [api, audience, specificUserId]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setConfirmOpen(true);
  }

  async function send() {
    setSaving(true);
    setError('');
    setResultMsg('');
    try {
      const res = await api.sendBroadcast({
        audience,
        title: title.trim(),
        message: message.trim(),
        targetUrl: link.trim() || undefined,
        specificUserId:
          audience === 'SPECIFIC_USER' ? specificUserId.trim() : undefined,
        idempotencyKey:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : undefined,
      });
      setConfirmOpen(false);
      setResultMsg(
        res.deduplicated
          ? t('broadcastDeduplicated')
          : t('broadcastSent', { count: res.broadcast.recipientCount }),
      );
      setTitle('');
      setMessage('');
      setLink('');
      refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('broadcastFailed'));
    } finally {
      setSaving(false);
    }
  }

  const dateLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('notificationsAdmin')}
        subtitle={t('notificationsAdminSubtitle')}
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {resultMsg ? <p className="text-sm text-emerald-700">{resultMsg}</p> : null}

      {stats ? (
        <AdminPanel title={t('notificationStats')}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl border p-3 text-sm">
              <p className="text-slate-500">{t('statTotal')}</p>
              <p className="mt-1 text-xl font-bold">{stats.totalNotifications}</p>
            </div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="text-slate-500">{t('statReadRate')}</p>
              <p className="mt-1 text-xl font-bold">{stats.readRate}%</p>
            </div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="text-slate-500">{t('statPushRate')}</p>
              <p className="mt-1 text-xl font-bold">{stats.pushDeliveryRate}%</p>
            </div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="text-slate-500">{t('statEmailRate')}</p>
              <p className="mt-1 text-xl font-bold">{stats.emailDeliveryRate}%</p>
            </div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="text-slate-500">{t('statFailed')}</p>
              <p className="mt-1 text-xl font-bold">{stats.failed}</p>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel title={t('composeNotification')}>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  audience === a ? 'bg-on-surface text-white' : 'border'
                }`}
              >
                {t(`audience.${AUDIENCE_I18N[a]}`)}
              </button>
            ))}
          </div>
          {audience === 'SPECIFIC_USER' ? (
            <label className="block text-sm">
              <span className="mb-1 block">{t('specificUserId')}</span>
              <input
                value={specificUserId}
                onChange={(e) => setSpecificUserId(e.target.value)}
                className="w-full rounded-xl border px-3 py-2"
                required
              />
            </label>
          ) : null}
          <p className="text-xs text-slate-500">
            {recipientCount == null
              ? t('audienceEstimatePending')
              : t('audienceEstimate', { count: recipientCount })}
          </p>
          <label className="block text-sm">
            <span className="mb-1 block">{t('notificationTitle')}</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('notificationMessage')}</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              rows={4}
              required
              minLength={2}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">{t('notificationLink')}</span>
            <input
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="w-full rounded-xl border px-3 py-2"
              placeholder={t('notificationLinkPlaceholder')}
              dir="ltr"
            />
            <span className="mt-1 block text-xs text-slate-500">
              {t('notificationLinkHint')}
            </span>
          </label>
          <button
            type="submit"
            disabled={saving || (recipientCount != null && recipientCount === 0)}
            className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {t('sendBroadcast')}
          </button>
        </form>
      </AdminPanel>

      <AdminPanel title={t('broadcastHistory')}>
        {historyLoading ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-slate-500">{t('broadcastHistoryEmpty')}</p>
        ) : (
          <ul className="divide-y">
            {history.map((item) => (
              <li key={item.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-on-surface">{item.title}</p>
                  <time className="text-xs text-slate-500" dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleString(dateLocale)}
                  </time>
                </div>
                <p className="text-sm text-slate-600 line-clamp-2">{item.message}</p>
                <p className="text-xs text-slate-500">
                  {t(`audience.${AUDIENCE_I18N[item.audience]}`)}
                  {' · '}
                  {t('broadcastRecipientCount', { count: item.recipientCount })}
                  {item.actor ? ` · ${item.actor.name}` : null}
                  {item.targetUrl ? ` · ${item.targetUrl}` : null}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>

      <AdminConfirmDialog
        open={confirmOpen}
        title={t('confirmSendNotification')}
        message={
          recipientCount == null
            ? t('confirmSendNotification')
            : t('confirmSendWithCount', { count: recipientCount })
        }
        confirmLabel={t('sendBroadcast')}
        isLoading={saving}
        onConfirm={() => void send()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
