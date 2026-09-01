'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { useAuth } from '@/contexts/auth-context';
import { loginSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/api';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';
import { buildAuthHref, resolvePostAuthPath } from '@/lib/auth-redirect';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    };

    const parsed = loginSchema.safeParse(payload);

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة');
      return;
    }

    setIsSubmitting(true);

    try {
      await login(parsed.data.email, parsed.data.password);
      router.push(resolvePostAuthPath(nextPath));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="تسجيل الدخول"
      subtitle={PLATFORM_TAGLINE_AR}
      footer={
        <>
          ليس لديك حساب؟{' '}
          <Link
            href={buildAuthHref('/register', { next: nextPath ?? undefined })}
            className="font-semibold text-primary"
          >
            إنشاء حساب
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
          {error ? (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium">
              البريد الإلكتروني
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
            <label htmlFor="password" className="mb-1 block text-sm font-medium">
              كلمة المرور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-primary"
            />
          </div>

          <div className="text-end">
            <Link href="/forgot-password" className="text-sm text-primary">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">جاري التحميل...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
