'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { useAuth } from '@/contexts/auth-context';
import { loginSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/api';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';

export default function LoginPage() {
  const router = useRouter();
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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل تسجيل الدخول');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        title="تسجيل الدخول"
        subtitle={PLATFORM_TAGLINE_AR}
        footer={
          <>
            ليس لديك حساب؟{' '}
            <Link href="/register" className="font-semibold text-[#00A86B]">
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
            />
          </div>

          <div className="text-end">
            <Link href="/forgot-password" className="text-sm text-[#00A86B]">
              نسيت كلمة المرور؟
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#00A86B] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'جاري الدخول...' : 'تسجيل الدخول'}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
