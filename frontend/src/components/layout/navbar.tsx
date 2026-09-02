'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NuqatiBadge } from '@/components/nuqati/points-badge';
import { useUnreadMessageCount } from '@/hooks/use-unread-messages';
import { Logo } from '@/components/brand/logo';
import { NavSearch } from '@/components/layout/nav-search';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

function NavLink({
  href,
  children,
  onNavigate,
  active,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate?: () => void;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`block rounded-lg px-3 py-2 text-sm font-medium md:inline md:px-0 md:py-0 md:hover:bg-transparent ${
        active
          ? 'text-primary md:font-semibold'
          : 'text-slate-700 hover:bg-slate-100 md:hover:text-slate-900'
      }`}
    >
      {children}
    </Link>
  );
}

export function Navbar() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
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
    <header className="border-b border-outline-variant/40 bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-start gap-2 sm:items-center sm:gap-3">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <Logo />
            <button
              type="button"
              className="rounded-lg border border-slate-200 p-2 text-slate-700 md:hidden"
              aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>

        <div className="hidden flex-1 items-center justify-center px-4 lg:flex">
          <NavSearch />
        </div>

        <div className="hidden items-center gap-5 lg:flex">
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-700">
            {user?.role === 'CLIENT' ? (
              <>
                <NavLink href="/dashboard" active={pathname === '/dashboard'}>
                  {t('dashboard')}
                </NavLink>
                <NavLink
                  href="/dashboard/projects"
                  active={pathname.startsWith('/dashboard/projects')}
                >
                  {t('myProjects')}
                </NavLink>
                <NavLink href="/dashboard/projects/new">{t('postProject')}</NavLink>
                <NavLink href="/freelancers">{t('findTalent')}</NavLink>
              </>
            ) : user?.role === 'FREELANCER' ? (
              <>
                <NavLink href="/dashboard" active={pathname === '/dashboard'}>
                  {t('dashboard')}
                </NavLink>
                <NavLink
                  href="/dashboard/nuqati"
                  active={pathname.startsWith('/dashboard/nuqati')}
                >
                  {t('nuqati')}
                </NavLink>
                <NavLink
                  href="/dashboard/proposals"
                  active={pathname.startsWith('/dashboard/proposals')}
                >
                  {t('myProposals')}
                </NavLink>
                <NavLink href="/projects">{t('browseProjects')}</NavLink>
                <NavLink
                  href="/dashboard/portfolio"
                  active={pathname.startsWith('/dashboard/portfolio')}
                >
                  {t('portfolio')}
                </NavLink>
              </>
            ) : (
              <>
                <Link href="/projects">{t('browseProjects')}</Link>
                <Link href="/freelancers">{t('freelancers')}</Link>
                <Link href="/how-it-works">{t('howItWorks')}</Link>
              </>
            )}
            {user ? (
              <>
                <NotificationBell />
                <Link href="/messages" className="relative inline-flex items-center">
                  {t('messages')}
                  {messageBadge}
                </Link>
                <Link
                  href="/dashboard/profile"
                  className={pathname.startsWith('/dashboard/profile') ? 'font-semibold text-primary' : ''}
                >
                  {t('profile')}
                </Link>
              </>
            ) : null}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <ThemeToggle />
          {isLoading ? (
            <span className="text-sm text-slate-400">{tCommon('loading')}</span>
          ) : user ? (
            <>
              {user.role === 'FREELANCER' ? <NuqatiBadge /> : null}
              <div className="hidden md:block">
                <NotificationBell />
              </div>
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                {t('dashboard')}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="hidden text-sm text-slate-600 hover:text-slate-900 sm:inline"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/register?role=CLIENT&next=/dashboard/projects/new"
                className="hidden rounded-lg border border-secondary px-3 py-2 text-sm font-semibold text-secondary sm:inline-flex"
              >
                {t('postProject')}
              </Link>
              <Link href="/login" className="hidden text-sm font-medium text-slate-700 sm:inline">
                {t('login')}
              </Link>
              <Link
                href="/register?role=FREELANCER"
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white sm:px-4"
              >
                {t('joinFree')}
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
            aria-label={t('closeMenu')}
            onClick={closeMobile}
          />
          <nav
            className="fixed inset-y-0 start-0 z-50 flex w-[min(100%,20rem)] flex-col gap-1 overflow-y-auto border-e border-slate-200 bg-white p-4 shadow-xl md:hidden"
            aria-label={t('mainMenu')}
          >
            <NavLink href="/" onNavigate={closeMobile}>
              {t('home')}
            </NavLink>
            <NavLink href="/projects" onNavigate={closeMobile}>
              {t('browseProjects')}
            </NavLink>
            <NavLink href="/freelancers" onNavigate={closeMobile}>
              {t('freelancers')}
            </NavLink>
            <NavLink href="/#how-it-works" onNavigate={closeMobile}>
              {t('howItWorksFull')}
            </NavLink>
            {user ? (
              <>
                <NavLink href="/dashboard" onNavigate={closeMobile} active={pathname === '/dashboard'}>
                  {t('dashboard')}
                </NavLink>
                {user.role === 'CLIENT' ? (
                  <>
                    <NavLink
                      href="/dashboard/projects"
                      onNavigate={closeMobile}
                      active={pathname.startsWith('/dashboard/projects')}
                    >
                      {t('myProjects')}
                    </NavLink>
                    <NavLink href="/dashboard/projects/new" onNavigate={closeMobile}>
                      {t('postProject')}
                    </NavLink>
                    <NavLink href="/freelancers" onNavigate={closeMobile}>
                      {t('findTalent')}
                    </NavLink>
                  </>
                ) : null}
                {user.role === 'FREELANCER' ? (
                  <>
                    <NavLink
                      href="/dashboard/nuqati"
                      onNavigate={closeMobile}
                      active={pathname.startsWith('/dashboard/nuqati')}
                    >
                      {t('nuqati')}
                    </NavLink>
                    <NavLink href="/dashboard/proposals" onNavigate={closeMobile}>
                      {t('myProposals')}
                    </NavLink>
                    <NavLink href="/dashboard/portfolio" onNavigate={closeMobile}>
                      {t('portfolio')}
                    </NavLink>
                    <NavLink href="/projects" onNavigate={closeMobile}>
                      {t('browseProjects')}
                    </NavLink>
                  </>
                ) : null}
                <NavLink href="/dashboard/profile" onNavigate={closeMobile}>
                  {t('profile')}
                </NavLink>
                <NavLink href="/messages" onNavigate={closeMobile}>
                  {t('messages')}
                  {messageBadge}
                </NavLink>
                <div className="py-2">
                  <NotificationBell />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    logout();
                  }}
                  className="mt-2 rounded-lg px-3 py-2 text-start text-sm text-red-600 hover:bg-red-50"
                >
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  href="/register?role=CLIENT&next=/dashboard/projects/new"
                  onNavigate={closeMobile}
                >
                  {t('postProject')}
                </NavLink>
                <NavLink href="/login" onNavigate={closeMobile}>
                  {t('login')}
                </NavLink>
                <NavLink href="/register?role=FREELANCER" onNavigate={closeMobile}>
                  {t('joinFree')}
                </NavLink>
              </>
            )}
          </nav>
        </>
      ) : null}
    </header>
  );
}
