'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useUnreadMessageCount } from '@/hooks/use-unread-messages';
import { PLATFORM_NAME_AR, PLATFORM_TAGLINE_AR } from '@/lib/branding';

function NavLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 md:inline md:px-0 md:py-0 md:hover:bg-transparent"
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const { user, logout, isLoading } = useAuth();
  const unreadMessages = useUnreadMessageCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  const messageBadge =
    unreadMessages > 0 ? (
      <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
        {unreadMessages > 9 ? '9+' : unreadMessages}
      </span>
    ) : null;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link href="/" className="flex min-w-0 flex-col leading-tight">
          <span className="text-xl font-bold text-[#0B132B]">{PLATFORM_NAME_AR}</span>
          <span className="max-w-[14rem] truncate text-xs text-slate-500 sm:max-w-none">
            {PLATFORM_TAGLINE_AR}
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-700 md:flex">
          <Link href="/">الرئيسية</Link>
          <Link href="/projects">تصفح المشاريع</Link>
          <Link href="/freelancers">المستقلون</Link>
          <Link href="/#how-it-works">كيف تعمل المنصة</Link>
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
              <Link href="/messages" className="relative inline-flex items-center">
                الرسائل
                {messageBadge}
              </Link>
            </>
          ) : null}
          {user?.role === 'CLIENT' ? (
            <Link href="/dashboard/projects">مشاريعي</Link>
          ) : null}
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden"
            aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>

          {isLoading ? (
            <span className="text-sm text-slate-400">...</span>
          ) : user ? (
            <>
              <div className="hidden md:block">
                <NotificationBell />
              </div>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[#00A86B] px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                لوحة التحكم
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="hidden text-sm text-slate-600 hover:text-slate-900 sm:inline"
              >
                خروج
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-slate-700 sm:inline">
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-[#00A86B] px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </div>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="إغلاق القائمة"
            onClick={closeMobile}
          />
          <nav
            className="fixed inset-y-0 start-0 z-50 flex w-[min(100%,20rem)] flex-col gap-1 overflow-y-auto border-e border-slate-200 bg-white p-4 shadow-xl md:hidden"
            aria-label="القائمة الرئيسية"
          >
            <NavLink href="/" onNavigate={closeMobile}>
              الرئيسية
            </NavLink>
            <NavLink href="/projects" onNavigate={closeMobile}>
              تصفح المشاريع
            </NavLink>
            <NavLink href="/freelancers" onNavigate={closeMobile}>
              المستقلون
            </NavLink>
            <NavLink href="/#how-it-works" onNavigate={closeMobile}>
              كيف تعمل المنصة
            </NavLink>
            {user ? (
              <>
                <NavLink href="/dashboard/profile" onNavigate={closeMobile}>
                  الملف الشخصي
                </NavLink>
                <NavLink href="/messages" onNavigate={closeMobile}>
                  الرسائل{messageBadge}
                </NavLink>
                <div className="py-2">
                  <NotificationBell />
                </div>
                {user.role === 'FREELANCER' ? (
                  <>
                    <NavLink href="/dashboard/proposals" onNavigate={closeMobile}>
                      عروضي
                    </NavLink>
                    <NavLink href="/dashboard/portfolio" onNavigate={closeMobile}>
                      معرض الأعمال
                    </NavLink>
                  </>
                ) : null}
                {user.role === 'CLIENT' ? (
                  <NavLink href="/dashboard/projects" onNavigate={closeMobile}>
                    مشاريعي
                  </NavLink>
                ) : null}
                <NavLink href="/dashboard" onNavigate={closeMobile}>
                  لوحة التحكم
                </NavLink>
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    logout();
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50"
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <NavLink href="/login" onNavigate={closeMobile}>
                  تسجيل الدخول
                </NavLink>
                <NavLink href="/register" onNavigate={closeMobile}>
                  إنشاء حساب
                </NavLink>
              </>
            )}
          </nav>
        </>
      ) : null}
    </header>
  );
}
