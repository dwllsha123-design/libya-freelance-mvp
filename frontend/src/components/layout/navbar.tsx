'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useUnreadMessageCount } from '@/hooks/use-unread-messages';
import { PLATFORM_NAME_AR, PLATFORM_TAGLINE_AR } from '@/lib/branding';

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const unreadMessages = useUnreadMessageCount();

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex flex-col leading-tight">
          <span className="text-xl font-bold text-[#0B132B]">{PLATFORM_NAME_AR}</span>
          <span className="max-w-[14rem] text-xs text-slate-500 sm:max-w-none">{PLATFORM_TAGLINE_AR}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <Link href="/">الرئيسية</Link>
          <Link href="/projects">تصفح المشاريع</Link>
          <Link href="/freelancers">المستقلون</Link>
          <Link href="/how-it-works">كيف تعمل المنصة</Link>
          {user ? <Link href="/dashboard/profile">الملف الشخصي</Link> : null}
          {user?.role === 'FREELANCER' ? (
            <>
              <Link href="/dashboard/proposals">عروضي</Link>
              <Link href="/dashboard/portfolio">معرض الأعمال</Link>
            </>
          ) : null}
          {user ? (
            <>
              <NotificationBell />
              <Link href="/messages" className="relative">
                الرسائل
                {unreadMessages > 0 ? (
                  <span className="absolute -left-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                ) : null}
              </Link>
            </>
          ) : null}
          {user?.role === 'CLIENT' ? (
            <Link href="/dashboard/projects">مشاريعي</Link>
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          {isLoading ? (
            <span className="text-sm text-slate-400">...</span>
          ) : user ? (
            <>
              {user?.role === 'CLIENT' ? (
                <Link href="/dashboard/projects" className="hidden text-sm md:inline">
                  مشاريعي
                </Link>
              ) : null}
              {user?.role === 'FREELANCER' ? (
                <Link href="/dashboard/proposals" className="hidden text-sm md:inline">
                  عروضي
                </Link>
              ) : null}
              <div className="md:hidden">
                <NotificationBell />
              </div>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white"
              >
                لوحة التحكم
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-700">
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[#00A86B] px-4 py-2 text-sm font-semibold text-white"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
