'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { AuthCard } from '@/components/auth/auth-card';
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
            className="font-semibold text-primary"
          >
            {t('loginButton')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
              {t('firstName')}
            </label>
            <input
              id="firstName"
              name="firstName"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium">
              {t('lastName')}
            </label>
            <input
              id="lastName"
              name="lastName"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
          />
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium">{t('chooseRole')}</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole('FREELANCER')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                role === 'FREELANCER'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-300'
              }`}
            >
              {t('roleFreelancer')}
            </button>
            <button
              type="button"
              onClick={() => setRole('CLIENT')}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                role === 'CLIENT'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-slate-300'
              }`}
            >
              {t('roleClient')}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium">
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium">
            {t('confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
        >
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
      <Suspense fallback={<div className="text-slate-500">{tCommon('loadingPage')}</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
