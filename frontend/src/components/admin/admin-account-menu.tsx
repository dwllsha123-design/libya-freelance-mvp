'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/contexts/auth-context';
import {
  ADMIN_ACCOUNT_PATH,
  ADMIN_SECURITY_PATH,
} from '@/lib/admin-account-nav';
import { getAdminLoginHref } from '@/lib/roles';

/**
 * Dedicated admin staff account dropdown.
 * Must never inherit marketplace account/profile routes.
 */
export function AdminAccountMenu() {
  const t = useTranslations('admin');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  async function handleLogout() {
    setOpen(false);
    try {
      await logout();
    } finally {
      window.location.assign(getAdminLoginHref(locale));
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border px-3 py-2 text-sm"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {t('ownerProfile')}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute left-0 z-40 mt-2 w-44 rounded-xl border bg-white py-1 shadow-lg"
        >
          <Link
            href={ADMIN_ACCOUNT_PATH}
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            {t('myAccount')}
          </Link>
          <Link
            href={ADMIN_SECURITY_PATH}
            role="menuitem"
            className="block px-3 py-2 text-sm hover:bg-slate-50"
            onClick={() => setOpen(false)}
          >
            {t('securityCenter')}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void handleLogout()}
            className="block w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-slate-50"
          >
            {tNav('logout')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
