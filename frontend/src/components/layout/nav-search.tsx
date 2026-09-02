'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useState } from 'react';

export function NavSearch() {
  const t = useTranslations('search');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  function submit(target: 'projects' | 'freelancers') {
    const q = query.trim();
    setOpen(false);
    if (q) {
      router.push(`/${target}?q=${encodeURIComponent(q)}`);
    } else {
      router.push(`/${target}`);
    }
  }

  return (
    <div className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant"
      >
        <span>🔍</span>
        <span>{t('search')}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={t('closeSearch')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute start-0 top-full z-50 mt-2 w-80 rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit('projects');
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-outline-variant/60 bg-surface-container-low px-3 py-2 text-sm outline-none focus:border-primary"
              autoFocus
            />
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <button
                type="button"
                onClick={() => submit('projects')}
                className="rounded-lg bg-surface-container-low px-3 py-2 text-start hover:bg-surface-container"
              >
                {t('searchProjects')}
              </button>
              <button
                type="button"
                onClick={() => submit('freelancers')}
                className="rounded-lg bg-surface-container-low px-3 py-2 text-start hover:bg-surface-container"
              >
                {t('searchFreelancers')}
              </button>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="text-center text-xs text-primary hover:underline"
              >
                {t('advancedSearch')}
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
