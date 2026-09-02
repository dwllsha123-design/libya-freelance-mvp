'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi, type AdminSearchResult } from '@/hooks/use-admin';
import { getSiteUrl } from '@/lib/site-urls';

type NavItem = {
  href: string;
  labelKey: string;
  exact?: boolean;
};

type NavGroup = {
  id: string;
  titleKey: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'home',
    titleKey: 'navHome',
    items: [{ href: '/admin', labelKey: 'dashboard', exact: true }],
  },
  {
    id: 'market',
    titleKey: 'navMarket',
    items: [
      { href: '/admin/users', labelKey: 'users' },
      { href: '/admin/freelancers', labelKey: 'freelancers' },
      { href: '/admin/clients', labelKey: 'clients' },
      { href: '/admin/projects', labelKey: 'projects' },
      { href: '/admin/proposals', labelKey: 'proposals' },
      { href: '/admin/reviews', labelKey: 'reviews' },
      { href: '/admin/portfolio', labelKey: 'portfolioModeration' },
      { href: '/admin/disputes', labelKey: 'disputes' },
    ],
  },
  {
    id: 'finance',
    titleKey: 'navFinanceGroup',
    items: [
      { href: '/admin/finance', labelKey: 'financeOverview' },
      { href: '/admin/finance/commission', labelKey: 'commissionSettings' },
      { href: '/admin/finance/transactions', labelKey: 'financeTransactions' },
      { href: '/admin/investors', labelKey: 'investors' },
      { href: '/admin/investors/agreements', labelKey: 'investmentAgreements' },
      { href: '/admin/investors/accruals', labelKey: 'investorAccruals' },
      { href: '/admin/investors/payouts', labelKey: 'investorPayouts' },
    ],
  },
  {
    id: 'site',
    titleKey: 'navSite',
    items: [
      { href: '/admin/content', labelKey: 'contentManagement' },
      { href: '/admin/categories', labelKey: 'categories' },
      { href: '/admin/skills', labelKey: 'skills' },
      { href: '/admin/content/banners', labelKey: 'announcementBanners' },
      { href: '/admin/notifications', labelKey: 'notificationsAdmin' },
    ],
  },
  {
    id: 'system',
    titleKey: 'navSystem',
    items: [
      { href: '/admin/settings', labelKey: 'settings' },
      { href: '/admin/settings/mobile', labelKey: 'mobileSettingsTitle' },
      { href: '/admin/admins', labelKey: 'adminsPermissions' },
      { href: '/admin/security', labelKey: 'securityCenter' },
      { href: '/admin/audit', labelKey: 'audit' },
      { href: '/admin/system', labelKey: 'systemHealth' },
    ],
  },
];

function NavIcon({ name }: { name: string }) {
  const common = 'h-4 w-4 shrink-0 opacity-70';
  switch (name) {
    case 'dashboard':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 13h7V4H4v9zm9 7h7V4h-7v16zM4 20h7v-5H4v5z" />
        </svg>
      );
    case 'users':
    case 'freelancers':
    case 'clients':
    case 'adminsPermissions':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="3" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'financeOverview':
    case 'commissionSettings':
    case 'financeTransactions':
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    default:
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}

function isActivePath(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({
  children,
  title,
}: {
  children: React.ReactNode;
  title?: string;
}) {
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const api = useAdminApi();
  const siteUrl = getSiteUrl();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<AdminSearchResult | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  let pageTitle = title ?? t('controlCenterTitle');
  if (!title) {
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (isActivePath(pathname, item.href, item.exact)) {
          pageTitle = t(item.labelKey);
        }
      }
    }
  }

  useEffect(() => {
    const closeTimer = window.setTimeout(() => {
      setDrawerOpen(false);
      setProfileOpen(false);
      setSearchOpen(false);
    }, 0);
    return () => window.clearTimeout(closeTimer);
  }, [pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!searchBoxRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = search.trim();
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (q.length < 2) {
        if (!cancelled) {
          setSearchResults(null);
          setSearchLoading(false);
          setSearchOpen(false);
        }
        return;
      }
      if (!cancelled) setSearchLoading(true);
      api
        .search(q)
        .then((res) => {
          if (!cancelled) {
            setSearchResults(res);
            setSearchOpen(true);
          }
        })
        .catch(() => {
          if (!cancelled) setSearchResults({ users: [], projects: [], investors: [] });
        })
        .finally(() => {
          if (!cancelled) setSearchLoading(false);
        });
    }, 280);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, search]);

  const roleLabel =
    user?.role === 'SUPER_ADMIN' ? t('roleSuperAdmin') : t('roleAdmin');

  const hasSearchHits =
    searchResults &&
    (searchResults.users.length > 0 ||
      searchResults.projects.length > 0 ||
      searchResults.investors.length > 0);

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-5 py-5">
        <div className="flex items-center gap-3">
          <Logo href={siteUrl} showName={false} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-on-surface">Libya Freelance</p>
            <p className="text-xs text-slate-500">{t('platformAdminLabel')}</p>
          </div>
        </div>
        <div className="mt-4 rounded-xl bg-surface-container-low px-3 py-2">
          <p className="text-xs text-slate-500">{roleLabel}</p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-on-surface">
              {user?.profile
                ? `${user.profile.firstName} ${user.profile.lastName}`
                : user?.email}
            </p>
            <span className="shrink-0 rounded-full bg-on-surface px-2 py-0.5 text-[10px] font-semibold text-white">
              {user?.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN'}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
        {NAV_GROUPS.map((group) => {
          const isCollapsed = collapsed[group.id];
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() =>
                  setCollapsed((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                }
                className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold tracking-wide text-slate-400"
              >
                <span>{t(group.titleKey)}</span>
                <span className="text-slate-300">{isCollapsed ? '+' : '−'}</span>
              </button>
              {!isCollapsed ? (
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = isActivePath(pathname, item.href, item.exact);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                          active
                            ? 'bg-on-surface text-white'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <NavIcon name={item.labelKey} />
                        <span className="truncate">{t(item.labelKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f4f5]" dir="rtl">
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[280px] border-l border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="close"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 w-[min(100%,290px)] bg-white shadow-xl">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:mr-[280px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 md:px-6">
            <button
              type="button"
              className="rounded-lg border px-3 py-2 text-sm lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              القائمة
            </button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-on-surface md:text-lg">
                {pageTitle}
              </p>
            </div>

            <div className="relative hidden max-w-xs flex-1 md:block" ref={searchBoxRef}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onFocus={() => {
                  if (search.trim().length >= 2) setSearchOpen(true);
                }}
                placeholder={t('adminGlobalSearch')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary"
              />
              {searchOpen && search.trim().length >= 2 ? (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-xl border bg-white py-2 shadow-lg">
                  {searchLoading ? (
                    <p className="px-3 py-2 text-xs text-slate-500">{t('loading')}</p>
                  ) : !hasSearchHits ? (
                    <p className="px-3 py-2 text-xs text-slate-500">{t('searchNoResults')}</p>
                  ) : (
                    <>
                      {searchResults!.users.length ? (
                        <div className="mb-1">
                          <p className="px-3 py-1 text-[10px] font-semibold text-slate-400">
                            {t('users')}
                          </p>
                          {searchResults!.users.map((u) => {
                            const name = u.profile
                              ? `${u.profile.firstName} ${u.profile.lastName}`.trim()
                              : u.email;
                            return (
                              <Link
                                key={u.id}
                                href={`/admin/users/${u.id}`}
                                className="block px-3 py-2 text-sm hover:bg-slate-50"
                                onClick={() => setSearchOpen(false)}
                              >
                                <span className="font-medium">{name}</span>
                                <span className="ms-2 text-xs text-slate-400">{u.role}</span>
                              </Link>
                            );
                          })}
                        </div>
                      ) : null}
                      {searchResults!.projects.length ? (
                        <div className="mb-1">
                          <p className="px-3 py-1 text-[10px] font-semibold text-slate-400">
                            {t('projects')}
                          </p>
                          {searchResults!.projects.map((p) => (
                            <Link
                              key={p.id}
                              href={`/admin/projects/${p.id}`}
                              className="block px-3 py-2 text-sm hover:bg-slate-50"
                              onClick={() => setSearchOpen(false)}
                            >
                              {p.title}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                      {searchResults!.investors.length ? (
                        <div>
                          <p className="px-3 py-1 text-[10px] font-semibold text-slate-400">
                            {t('investors')}
                          </p>
                          {searchResults!.investors.map((inv) => (
                            <Link
                              key={inv.id}
                              href={`/admin/investors/${inv.id}`}
                              className="block px-3 py-2 text-sm hover:bg-slate-50"
                              onClick={() => setSearchOpen(false)}
                            >
                              {inv.name}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <span
                className="hidden items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 sm:inline-flex"
                title={t('systemStatusOk')}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {t('systemStatusOk')}
              </span>
              <LanguageSwitcher />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="rounded-xl border px-3 py-2 text-sm"
                >
                  {t('ownerProfile')}
                </button>
                {profileOpen ? (
                  <div className="absolute left-0 mt-2 w-44 rounded-xl border bg-white py-1 shadow-lg">
                    <a href={siteUrl} className="block px-3 py-2 text-sm hover:bg-slate-50">
                      {t('myAccount')}
                    </a>
                    <Link
                      href="/admin/security"
                      className="block px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      {t('securityCenter')}
                    </Link>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="block w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-slate-50"
                    >
                      {tNav('logout')}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto min-w-0 max-w-[1600px] px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
