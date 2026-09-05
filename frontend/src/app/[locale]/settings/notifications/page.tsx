'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import {
  useNotificationsApi,
  type PreferenceRow,
} from '@/hooks/use-notifications';
import { ApiError } from '@/lib/api';
import { registerWebPush } from '@/lib/web-push';

const LABELS: Record<string, string> = {
  GLOBAL: 'global',
  PROJECTS: 'projects',
  MESSAGES: 'messages',
  PAYMENTS: 'payments',
  POINTS: 'points',
  SYSTEM: 'system',
};

export default function NotificationSettingsPage() {
  const t = useTranslations('notifications');
  const tCommon = useTranslations('common');
  const { user, isLoading: authLoading } = useAuth();
  const api = useNotificationsApi();
  const [rows, setRows] = useState<PreferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api.getPreferences();
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : t('loadFailed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [api, t, user]);

  function toggle(
    type: string,
    field: 'inAppEnabled' | 'pushEnabled' | 'emailEnabled',
  ) {
    setRows((current) =>
      current.map((row) =>
        row.notificationType === type
          ? { ...row, [field]: !row[field] }
          : row,
      ),
    );
    setSaved(false);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updatePreferences(rows);
      setRows(updated);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function enablePush() {
    setPushStatus(null);
    try {
      const result = await registerWebPush(api);
      setPushStatus(result);
    } catch (err) {
      setPushStatus(err instanceof Error ? err.message : t('pushFailed'));
    }
  }

  if (authLoading) {
    return <div className="p-8 text-center">{tCommon('loadingPage')}</div>;
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>{t('loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">{t('preferencesTitle')}</h1>
      <p className="mt-2 text-sm text-slate-600">{t('preferencesHint')}</p>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {t('preferencesSaved')}
        </p>
      ) : null}

      <form onSubmit={(e) => void onSubmit(e)} className="mt-8 space-y-4">
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl border bg-white" />
        ) : (
          rows.map((row) => (
            <fieldset
              key={row.notificationType}
              className="rounded-xl border bg-white p-4"
            >
              <legend className="px-1 text-sm font-semibold text-on-surface">
                {t(`pref.${LABELS[row.notificationType] ?? 'system'}`)}
              </legend>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {(
                  [
                    ['inAppEnabled', 'channelInApp'],
                    ['pushEnabled', 'channelPush'],
                    ['emailEnabled', 'channelEmail'],
                  ] as const
                ).map(([field, labelKey]) => (
                  <label
                    key={field}
                    className="flex items-center gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={row[field]}
                      onChange={() => toggle(row.notificationType, field)}
                    />
                    {t(labelKey)}
                  </label>
                ))}
              </div>
            </fieldset>
          ))
        )}

        <div className="rounded-xl border bg-white p-4">
          <p className="text-sm font-semibold text-on-surface">{t('pushTitle')}</p>
          <p className="mt-1 text-xs text-slate-500">{t('pushHint')}</p>
          <button
            type="button"
            onClick={() => void enablePush()}
            className="mt-3 rounded-lg border px-4 py-2 text-sm text-primary"
          >
            {t('enablePush')}
          </button>
          {pushStatus ? (
            <p className="mt-2 text-xs text-slate-600">{pushStatus}</p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={saving || loading}
          className="rounded-lg bg-on-surface px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? tCommon('processing') : t('savePreferences')}
        </button>
      </form>
    </div>
  );
}
