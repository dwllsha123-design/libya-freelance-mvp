'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import {
  AuthCard,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
  authSubmitClassName,
} from '@/components/auth/auth-card';
import { apiRequest, ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('resetFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        title={t('forgotPasswordTitle')}
        subtitle={t('forgotPasswordSubtitle')}
        footer={
          <Link href="/login" className={authLinkClassName}>
            {t('backToLogin')}
          </Link>
        }
      >
        {sent ? (
          <p className="text-center text-sm text-ink-soft">{t('resetSentMessage')}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <div className={authErrorClassName}>{error}</div> : null}
            <div>
              <label htmlFor="email" className={authLabelClassName}>
                {t('email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className={authFieldClassName}
              />
            </div>
            <button type="submit" disabled={isSubmitting} className={authSubmitClassName}>
              {isSubmitting ? t('sendResetSubmitting') : t('sendResetLink')}
            </button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
