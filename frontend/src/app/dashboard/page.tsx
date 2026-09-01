'use client';

import { useAuth } from '@/contexts/auth-context';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">جاري التحميل...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="mb-4 text-slate-600">يجب تسجيل الدخول للوصول إلى لوحة التحكم</p>
        <Link href="/login" className="font-semibold text-[#00A86B]">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-[#0B132B]">لوحة التحكم</h1>
      <p className="mt-2 text-slate-600">
        مرحباً {user.profile?.firstName ?? user.email}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">نوع الحساب</p>
          <p className="mt-1 text-lg font-semibold">
            {user.role === 'FREELANCER' ? 'مستقل' : user.role === 'CLIENT' ? 'عميل' : 'مدير'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-sm text-slate-500">حالة الحساب</p>
          <p className="mt-1 text-lg font-semibold">
            {user.status === 'ACTIVE'
              ? 'نشط'
              : user.status === 'SUSPENDED'
                ? 'معلق'
                : 'محظور'}
          </p>
        </div>
      </div>

      <p className="mt-8 text-sm text-slate-500">
        سيتم إكمال لوحة التحكم في المراحل القادمة (المشاريع، العروض، الرسائل).
      </p>
    </div>
  );
}
