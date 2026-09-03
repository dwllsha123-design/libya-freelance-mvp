'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/auth-context';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { NuqatiBadge } from '@/components/nuqati/points-badge';
import { useUnreadMessageCount } from '@/hooks/use-unread-messages';
import { Logo } from '@/components/brand/logo';
import { NavSearch } from '@/components/layout/nav-search';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { DemoVideoModal } from '@/components/layout/demo-video-modal';
import { useIsClient } from '@/hooks/use-is-client';

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
      className={`inline-flex items-center rounded-full px-3 py-2 text-sm font-medium transition-colors xl:px-4 ${
        active
          ? 'bg-ink text-cream'
          : 'text-ink-soft hover:bg-cream-deep hover:text-ink'
      }`}
    >
      {children}
    </Link>
  );
}

function NavDropdown({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: string; desc: string; icon: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors xl:px-4 ${
          open ? 'bg-cream-deep text-ink' : 'text-ink-soft hover:bg-cream-deep hover:text-ink'
        }`}
      >
        {label}
        <span className={`text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open ? (
        <div className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-line bg-cream p-2 shadow-[0_24px_60px_-24px_rgba(21,32,60,0.45)]">
          {items.map((it) => (
            <Link
              key={it.href + it.label}
              href={it.href}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-cream-deep"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-ember/10 text-ember">
                {it.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-display text-sm font-semibold text-ink">{it.label}</span>
                <span className="block text-xs text-ink-soft">{it.desc}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function Navbar() {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const unreadMessages = useUnreadMessageCount();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const isClient = useIsClient();

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

  const browseMenu = [
    {
      href: '/projects',
      label: t('browseProjects'),
      desc: t('browseProjectsDesc'),
      icon: '⌕',
    },
    {
      href: '/search',
      label: t('advancedSearch'),
      desc: t('advancedSearchDesc'),
      icon: '✦',
    },
    {
      href: '/freelancers',
      label: t('freelancers'),
      desc: t('findTalentDesc'),
      icon: '◎',
    },
  ];

  const activityMenu = user
    ? [
        {
          href: '/dashboard',
          label: t('dashboard'),
          desc: t('dashboardDesc'),
          icon: '◱',
        },
        ...(user.role === 'FREELANCER'
          ? [
              {
                href: '/dashboard/proposals',
                label: t('myProposals'),
                desc: t('myProposalsDesc'),
                icon: '▤',
              },
              {
                href: '/dashboard/nuqati',
                label: t('nuqati'),
                desc: t('nuqatiDesc'),
                icon: '◈',
              },
            ]
          : [
              {
                href: '/dashboard/projects',
                label: t('myProjects'),
                desc: t('myProjectsDesc'),
                icon: '▤',
              },
            ]),
        {
          href: '/messages',
          label: t('messages'),
          desc: t('messagesDesc'),
          icon: '✉',
        },
      ]
    : [
        {
          href: '/login',
          label: t('login'),
          desc: t('loginDesc'),
          icon: '→',
        },
        {
          href: '/register?role=FREELANCER',
          label: t('joinFree'),
          desc: t('joinFreeDesc'),
          icon: '✦',
        },
      ];

  const messageBadge =
    unreadMessages > 0 ? (
      <span className="ms-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-ember px-1 text-[10px] font-bold text-white">
        {unreadMessages > 9 ? '9+' : unreadMessages}
      </span>
    ) : null;

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-cream/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="page-gutter mx-auto flex h-14 max-w-6xl items-center gap-2 sm:h-16 sm:gap-3">
        {/* Brand + theme (always visible beside the name) */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 lg:flex-none lg:shrink-0">
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line text-ink-soft lg:hidden"
            aria-label={mobileOpen ? t('closeMenu') : t('openMenu')}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
          <Logo
            compact
            iconClassName="size-8 sm:size-10"
            nameClassName="text-[0.95rem] sm:text-[1.05rem]"
          />
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        {/* Desktop nav — centered, no wrap */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex lg:gap-1">
          <NavLink href="/" active={pathname === '/'}>
            {t('home')}
          </NavLink>
          <NavDropdown label={t('findWork')} items={browseMenu} />
          <NavDropdown label={t('myActivity')} items={activityMenu} />
          {user ? (
            <>
              <NavLink href="/dashboard" active={pathname === '/dashboard'}>
                {t('dashboard')}
              </NavLink>
              <Link
                href="/messages"
                className="relative inline-flex items-center rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-cream-deep hover:text-ink xl:px-4"
              >
                {t('messages')}
                {messageBadge}
              </Link>
            </>
          ) : (
            <NavLink href="/how-it-works" active={pathname.startsWith('/how-it-works')}>
              {t('howItWorks')}
            </NavLink>
          )}
        </nav>

        {/* Actions — mobile keeps CTA only; tools live in the drawer */}
        <div className="ms-auto flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1.5 lg:flex">
            <NavSearch compact />
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              className="relative grid size-9 place-items-center rounded-full bg-ember text-white shadow-[0_6px_16px_-6px_rgba(239,77,26,0.8)] transition-transform hover:-translate-y-0.5"
              aria-label={t('demoTour')}
              title={t('demoTour')}
            >
              ▶
              <span className="absolute -top-1.5 -start-1.5 rounded-full bg-palm px-1.5 py-0.5 text-[9px] font-bold text-white">
                {t('newBadge')}
              </span>
            </button>
          </div>
          {isLoading ? (
            <span className="text-sm text-ink-soft">{tCommon('loading')}</span>
          ) : user ? (
            <>
              {user.role === 'FREELANCER' ? (
                <div className="hidden xl:block">
                  <NuqatiBadge />
                </div>
              ) : null}
              <div className="hidden lg:block">
                <NotificationBell />
              </div>
              <Link
                href="/dashboard"
                className="rounded-full bg-ember px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep sm:px-4 sm:text-sm"
              >
                {t('dashboard')}
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="hidden rounded-full px-3 py-2 text-sm text-ink-soft transition hover:bg-cream-deep hover:text-ink xl:inline"
              >
                {t('logout')}
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-cream-deep hover:text-ink sm:inline lg:inline"
              >
                {t('login')}
              </Link>
              <Link
                href="/register?role=FREELANCER"
                className="rounded-full bg-ember px-3 py-2 text-xs font-semibold text-white shadow-[0_6px_16px_-6px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep sm:px-4 sm:text-sm"
              >
                {t('joinFree')}
              </Link>
            </>
          )}
        </div>
      </div>

      {isClient && mobileOpen
        ? createPortal(
            <div className="lg:hidden">
              <button
                type="button"
                className="fixed inset-0 z-[60] bg-ink/40"
                aria-label={t('closeMenu')}
                onClick={closeMobile}
              />
              <nav
                className="fixed inset-y-0 start-0 z-[70] flex h-dvh w-[min(100%,20rem)] flex-col gap-1 overflow-y-auto border-e border-line bg-cream p-4 pt-[max(1rem,env(safe-area-inset-top))] shadow-[0_24px_60px_-24px_rgba(21,32,60,0.45)]"
                aria-label={t('mainMenu')}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Logo />
                  <button
                    type="button"
                    className="grid size-9 place-items-center rounded-lg border border-line text-ink-soft"
                    aria-label={t('closeMenu')}
                    onClick={closeMobile}
                  >
                    ✕
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    setDemoOpen(true);
                  }}
                  className="mb-2 inline-flex items-center gap-2 rounded-full bg-ember px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <span aria-hidden>▶</span>
                  {t('demoTour')}
                  <span className="rounded-full bg-palm px-1.5 py-0.5 text-[10px] font-bold">
                    {t('newBadge')}
                  </span>
                </button>
                <NavLink href="/" onNavigate={closeMobile} active={pathname === '/'}>
                  {t('home')}
                </NavLink>
                <NavLink href="/projects" onNavigate={closeMobile}>
                  {t('browseProjects')}
                </NavLink>
                <NavLink href="/freelancers" onNavigate={closeMobile}>
                  {t('freelancers')}
                </NavLink>
                <NavLink href="/search" onNavigate={closeMobile}>
                  {t('advancedSearch')}
                </NavLink>
                <NavLink href="/#how-it-works" onNavigate={closeMobile}>
                  {t('howItWorksFull')}
                </NavLink>
                {user ? (
                  <>
                    <NavLink
                      href="/dashboard"
                      onNavigate={closeMobile}
                      active={pathname === '/dashboard'}
                    >
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
                      className="mt-2 rounded-xl px-4 py-2.5 text-start text-sm text-error transition hover:bg-cream-deep"
                    >
                      {t('logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink href="/login" onNavigate={closeMobile}>
                      {t('login')}
                    </NavLink>
                    <NavLink href="/register?role=FREELANCER" onNavigate={closeMobile}>
                      {t('joinFree')}
                    </NavLink>
                  </>
                )}
              </nav>
            </div>,
            document.body,
          )
        : null}

      <DemoVideoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </header>
  );
}
