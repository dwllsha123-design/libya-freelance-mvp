'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthCard } from '@/components/auth/auth-card';
import { apiRequest, ApiError } from '@/lib/api';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';

export default function ForgotPasswordPage() {
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
      setError(err instanceof ApiError ? err.message : 'فشل الإرسال');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <AuthCard
        title="نسيت كلمة المرور"
        subtitle={PLATFORM_TAGLINE_AR}
        footer={
          <>
            <Link href="/login" className="font-semibold text-primary">
              العودة لتسجيل الدخول
            </Link>
          </>
        }
      >
        {sent ? (
          <p className="text-center text-sm text-on-surface-variant">
            إذا كان البريد مسجّلاً، ستصلك تعليمات إعادة التعيين قريباً.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-outline-variant/60 px-3 py-2 focus:border-primary"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-lg bg-primary py-2.5 font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}
      </AuthCard>
    </div>
  );
}
