'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import { createLoginSchema } from '@/lib/schemas/create-schemas';
import { ApiError } from '@/lib/api';
import { Logo } from '@/components/brand/logo';

export default function AdminLoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const t = useTranslations('admin');
  const tAuth = useTranslations('auth');
  const tValidation = useTranslations('validation');
  const loginSchema = useMemo(() => createLoginSchema(tValidation), [tValidation]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tValidation('invalidData'));
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(parsed.data.email, parsed.data.password);
      if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
        setError(t('adminLoginNotStaff'));
        return;
      }
      if (user.status !== 'ACTIVE') {
        setError(t('accessDenied'));
        return;
      }
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tAuth('loginFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-container-low px-4" dir="rtl">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo href="" showName={false} />
          <div>
            <h1 className="text-xl font-bold text-on-surface">{t('adminLoginTitle')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('adminLoginSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <div>
            <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">
              {tAuth('email')}
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
              {tAuth('password')}
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-on-surface px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSubmitting ? tAuth('loginSubmitting') : t('adminLoginButton')}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">{t('adminLoginNoPublicRegister')}</p>
      </div>
    </div>
  );
}
