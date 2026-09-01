'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { useAuth } from '@/contexts/auth-context';
import { registerSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/api';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';
import { buildAuthHref, resolvePostAuthPath } from '@/lib/auth-redirect';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');
  const roleParam = searchParams.get('role');
  const { register } = useAuth();
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
      setError(parsed.error.issues[0]?.message ?? 'بيانات غير صالحة');
      return;
    }

    setIsSubmitting(true);

    try {
      await register(parsed.data);
      router.push(resolvePostAuthPath(nextPath));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthCard
      title="إنشاء حساب"
      subtitle={PLATFORM_TAGLINE_AR}
      footer={
        <>
          لديك حساب بالفعل؟{' '}
          <Link
            href={buildAuthHref('/login', { next: nextPath ?? undefined })}
            className="font-semibold text-primary"
          >
            تسجيل الدخول
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="firstName" className="mb-1 block text-sm font-medium">
                الاسم الأول
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
                اسم العائلة
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
            <span className="mb-2 block text-sm font-medium">نوع الحساب</span>
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
                مستقل
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
                عميل
              </button>
            </div>
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

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium"
            >
              تأكيد كلمة المرور
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
            {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>
      </AuthCard>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<div className="text-slate-500">جاري التحميل...</div>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
