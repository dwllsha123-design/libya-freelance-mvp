'use client';

import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { useState } from 'react';

export function NavSearch({
  compact = false,
}: {
  /** Icon-only control for tight headers */
  compact?: boolean;
}) {
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
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          compact
            ? 'grid size-9 place-items-center rounded-full border border-line bg-cream text-ink-soft transition hover:bg-cream-deep'
            : 'flex items-center gap-2 rounded-full border border-line bg-cream-deep/60 px-3 py-2 text-sm text-ink-soft transition hover:bg-cream-deep'
        }
        aria-label={t('search')}
        title={t('search')}
      >
        <span aria-hidden>🔍</span>
        {compact ? null : <span>{t('search')}</span>}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label={t('closeSearch')}
            onClick={() => setOpen(false)}
          />
          <div className="absolute end-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface p-4 shadow-xl">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit('projects');
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full rounded-lg border border-line bg-cream px-3 py-2 text-sm text-ink outline-none focus:border-ember focus:ring-2 focus:ring-ember/25"
              autoFocus
            />
            <div className="mt-3 flex flex-col gap-2 text-sm">
              <button
                type="button"
                onClick={() => submit('projects')}
                className="rounded-lg bg-cream-deep/60 px-3 py-2 text-start text-ink hover:bg-cream-deep"
              >
                {t('searchProjects')}
              </button>
              <button
                type="button"
                onClick={() => submit('freelancers')}
                className="rounded-lg bg-cream-deep/60 px-3 py-2 text-start text-ink hover:bg-cream-deep"
              >
                {t('searchFreelancers')}
              </button>
              <Link
                href="/search"
                onClick={() => setOpen(false)}
                className="text-center text-xs text-ember hover:underline"
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
