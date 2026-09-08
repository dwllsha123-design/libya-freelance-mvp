'use client';

import { FormEvent, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, ApiError } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const t = useTranslations('auth');
  const locale = useLocale() as AppLocale;
  const { accessToken, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!accessToken) {
      setError(t('loginRequired'));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await authenticatedRequest<{ message: string }>(
        '/auth/change-password',
        accessToken,
        {
          method: 'POST',
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmNewPassword,
          }),
        },
      );
      setSuccess(result.message || t('changePasswordSuccess'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      onSuccess?.();
      // Sessions were revoked server-side — force re-login shortly
      window.setTimeout(() => {
        void logout();
      }, 1500);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : t('changePasswordFailed'),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="max-w-md space-y-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      {error ? (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}
      {success ? (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>
      ) : null}

      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm font-medium">
          {t('currentPassword')}
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium">
          {t('newPassword')}
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">{t('passwordRules')}</p>
      </div>

      <div>
        <label htmlFor="confirm-new-password" className="mb-1 block text-sm font-medium">
          {t('confirmNewPassword')}
        </label>
        <input
          id="confirm-new-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isSubmitting ? t('saving') : t('changePasswordSubmit')}
      </button>
    </form>
  );
}
