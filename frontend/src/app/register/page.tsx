'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthCard } from '@/components/auth/auth-card';
import { useAuth } from '@/contexts/auth-context';
import { registerSchema } from '@/lib/schemas/auth';
import { ApiError } from '@/lib/api';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [role, setRole] = useState<'FREELANCER' | 'CLIENT'>('FREELANCER');

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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'فشل إنشاء الحساب');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        title="إنشاء حساب"
        subtitle={PLATFORM_TAGLINE_AR}
        footer={
          <>
            لديك حساب بالفعل؟{' '}
            <Link href="/login" className="font-semibold text-[#00A86B]">
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
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
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
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
                    ? 'border-[#00A86B] bg-[#00A86B]/10 text-[#00A86B]'
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
                    ? 'border-[#00A86B] bg-[#00A86B]/10 text-[#00A86B]'
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#00A86B]"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-[#00A86B] px-4 py-2.5 font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء حساب'}
          </button>
        </form>
      </AuthCard>
    </div>
  );
}
