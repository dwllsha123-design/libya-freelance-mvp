'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { PLATFORM_NAME_AR } from '@/lib/branding';

const NAV = [
  { href: '/admin', label: 'لوحة التحكم', exact: true },
  { href: '/admin/users', label: 'المستخدمون' },
  { href: '/admin/projects', label: 'المشاريع' },
  { href: '/admin/proposals', label: 'العروض' },
  { href: '/admin/reviews', label: 'التقييمات' },
  { href: '/admin/disputes', label: 'نزاعات الضمان' },
  { href: '/admin/categories', label: 'التصنيفات' },
  { href: '/admin/skills', label: 'المهارات' },
  { href: '/admin/audit', label: 'سجل التدقيق' },
  { href: '/admin/settings', label: 'الإعدادات' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-surface-container-low">
      <div className="border-b bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div>
            <p className="font-bold text-on-surface">لوحة إدارة {PLATFORM_NAME_AR}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
          <div className="flex gap-3 text-sm">
            <Link href="/" className="text-primary">الموقع</Link>
            <button type="button" onClick={() => void logout()} className="text-slate-600">
              خروج
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row">
        <aside className="w-full shrink-0 rounded-xl border bg-white p-4 lg:w-56">
          <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {NAV.map((item) => {
              const active = item.exact
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
                  {item.label}
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
