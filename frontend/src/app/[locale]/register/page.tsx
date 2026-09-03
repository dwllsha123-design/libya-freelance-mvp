'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import {
  AuthCard,
  authErrorClassName,
  authFieldClassName,
  authLabelClassName,
  authLinkClassName,
  authSubmitClassName,
} from '@/components/auth/auth-card';
import { useAuth } from '@/contexts/auth-context';
import { createRegisterSchema } from '@/lib/schemas/create-schemas';
import { ApiError } from '@/lib/api';
import { buildAuthHref, getSafeNextPath, resolvePostAuthPath } from '@/lib/auth-redirect';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const roleParam = searchParams.get('role');
  const { register } = useAuth();
  const t = useTranslations('auth');
  const tBrand = useTranslations('brand');
  const tValidation = useTranslations('validation');
  const registerSchema = useMemo(() => createRegisterSchema(tValidation), [tValidation]);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<'FREELANCER' | 'CLIENT'>(() =>
    roleParam === 'CLIENT' || roleParam === 'FREELANCER' ? roleParam : 'FREELANCER',
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get('firstName') ?? ''),
      lastName: String(formData.get('lastName') ?? ''),
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
      confirmPassword: String(formData.get('confirmPassword') ?? ''),
      role,
    };

    const parsed = registerSchema.safeParse(payload);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? tValidation('invalidData'));
      return;
    }

    setIsSubmitting(true);

    try {
      await register(parsed.data);
      const safeNext = getSafeNextPath(nextPath);
      const destination =
        role === 'CLIENT'
          ? `/dashboard/complete-profile${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`
          : resolvePostAuthPath(nextPath);
      router.push(destination);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('registerFailed'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title={t('registerTitle')}
      subtitle={tBrand('tagline')}
      footer={
        <>
          {t('hasAccount')}{' '}
          <Link
            href={buildAuthHref('/login', { next: nextPath ?? undefined })}
            className={authLinkClassName}
          >
            {t('loginButton')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <div className={authErrorClassName}>{error}</div> : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className={authLabelClassName}>
              {t('firstName')}
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              autoComplete="given-name"
              className={authFieldClassName}
            />
          </div>
          <div>
            <label htmlFor="lastName" className={authLabelClassName}>
              {t('lastName')}
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              autoComplete="family-name"
              className={authFieldClassName}
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className={authLabelClassName}>
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={authFieldClassName}
          />
        </div>

        <div>
          <span className={authLabelClassName}>{t('chooseRole')}</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('FREELANCER')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                role === 'FREELANCER'
                  ? 'border-ember bg-ember/10 text-ember'
                  : 'border-line bg-cream text-ink-soft hover:border-ink/30'
              }`}
            >
              {t('roleFreelancer')}
            </button>
            <button
              type="button"
              onClick={() => setRole('CLIENT')}
              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                role === 'CLIENT'
                  ? 'border-ember bg-ember/10 text-ember'
                  : 'border-line bg-cream text-ink-soft hover:border-ink/30'
              }`}
            >
              {t('roleClient')}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="password" className={authLabelClassName}>
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={authFieldClassName}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabelClassName}>
            {t('confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            className={authFieldClassName}
          />
        </div>

        <button type="submit" disabled={isSubmitting} className={authSubmitClassName}>
          {isSubmitting ? t('registerSubmitting') : t('registerButton')}
        </button>
      </form>
    </AuthCard>
  );
}

export default function RegisterPage() {
  const tCommon = useTranslations('common');

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-ink-soft">{tCommon('loadingPage')}</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
