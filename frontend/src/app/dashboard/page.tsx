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
        <Link href="/login" className="font-semibold text-primary">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">لوحة التحكم</h1>
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {user.role === 'CLIENT' ? (
          <Link href="/dashboard/projects" className="rounded-xl border p-5 hover:border-primary">
            <p className="font-semibold">مشاريعي</p>
            <p className="mt-1 text-sm text-slate-500">إدارة المشاريع والعروض</p>
          </Link>
        ) : null}
        {user.role === 'FREELANCER' ? (
          <Link href="/dashboard/proposals" className="rounded-xl border p-5 hover:border-primary">
            <p className="font-semibold">عروضي</p>
            <p className="mt-1 text-sm text-slate-500">مشاريعي قيد التنفيذ</p>
          </Link>
        ) : null}
        <Link href="/dashboard/escrow" className="rounded-xl border p-5 hover:border-primary">
          <p className="font-semibold">سجل الضمان</p>
          <p className="mt-1 text-sm text-slate-500">معاملات الضمان بالدينار الليبي</p>
        </Link>
        <Link href="/messages" className="rounded-xl border p-5 hover:border-primary">
          <p className="font-semibold">الرسائل</p>
          <p className="mt-1 text-sm text-slate-500">محادثاتك</p>
        </Link>
      </div>
    </div>
  );
}
