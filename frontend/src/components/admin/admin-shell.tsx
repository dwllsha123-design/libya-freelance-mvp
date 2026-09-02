'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { Logo } from '@/components/brand/logo';
import { LanguageSwitcher } from '@/components/layout/language-switcher';
import { useAuth } from '@/contexts/auth-context';

const NAV = [
  { href: '/admin', key: 'dashboard', exact: true },
  { href: '/admin/users', key: 'users' },
  { href: '/admin/projects', key: 'projects' },
  { href: '/admin/proposals', key: 'proposals' },
  { href: '/admin/reviews', key: 'reviews' },
  { href: '/admin/disputes', key: 'disputes' },
  { href: '/admin/categories', key: 'categories' },
  { href: '/admin/skills', key: 'skills' },
  { href: '/admin/audit', key: 'audit' },
  { href: '/admin/settings', key: 'settings' },
] as const;

export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo href="/" showName={false} />
            <div>
              <p className="font-bold text-on-surface">{t('panelTitle')}</p>
              <p className="text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <LanguageSwitcher />
            <Link href="/" className="text-primary">{t('site')}</Link>
            <button type="button" onClick={() => void logout()} className="text-slate-600">
              {tNav('logout')}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-xl border bg-white p-4 lg:w-56">
          <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {NAV.map((item) => {
              const active =
                'exact' in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    active
                      ? 'bg-on-surface text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
