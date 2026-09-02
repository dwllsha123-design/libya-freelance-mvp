'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useAdminApi, type AdminCmsBundle } from '@/hooks/use-admin';
import { AdminPageHeader, AdminPanel } from '@/components/admin/admin-layout-ui';

type HeroContent = {
  title: string;
  subtitle: string;
  cta: string;
};

function asHero(value: unknown): HeroContent {
  const obj = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    title: String(obj.title ?? obj.heroTitle ?? ''),
    subtitle: String(obj.subtitle ?? obj.heroSubtitle ?? ''),
    cta: String(obj.cta ?? obj.ctaLabel ?? ''),
  };
}

export default function AdminContentPage() {
  const t = useTranslations('admin');
  const api = useAdminApi();
  const [bundle, setBundle] = useState<AdminCmsBundle | null>(null);
  const [hero, setHero] = useState<HeroContent>({ title: '', subtitle: '', cta: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .listCms()
      .then((data) => {
        if (cancelled) return;
        setBundle(data);
        setHero(asHero(data.blocks.HOMEPAGE_HERO));
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : t('contentLoadFailed'));
      });
    return () => {
      cancelled = true;
    };
  }, [api, t]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api.upsertCms({
        key: 'HOMEPAGE_HERO',
        contentJson: {
          title: hero.title.trim(),
          subtitle: hero.subtitle.trim(),
          cta: hero.cta.trim(),
        },
      });
      const data = await api.listCms();
      setBundle(data);
      setHero(asHero(data.blocks.HOMEPAGE_HERO));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contentSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t('contentManagement')}
        subtitle={t('contentManagementSubtitle')}
        actions={
          <Link
            href="/admin/content/banners"
            className="rounded-xl border px-3 py-2 text-sm hover:bg-slate-50"
          >
            {t('announcementBanners')}
          </Link>
        }
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <AdminPanel title={t('homePageContent')}>
        {!bundle ? (
          <p className="text-sm text-slate-500">{t('loading')}</p>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('heroTitle')}</span>
              <input
                value={hero.title}
                onChange={(e) => setHero((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
                required
                minLength={2}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('heroSubtitle')}</span>
              <textarea
                value={hero.subtitle}
                onChange={(e) => setHero((prev) => ({ ...prev, subtitle: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
                rows={2}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">{t('ctaLabel')}</span>
              <input
                value={hero.cta}
                onChange={(e) => setHero((prev) => ({ ...prev, cta: e.target.value }))}
                className="w-full rounded-xl border px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-on-surface px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? t('loading') : t('saveContent')}
            </button>
            {saved ? <p className="text-xs text-emerald-700">{t('contentSaved')}</p> : null}
          </form>
        )}
      </AdminPanel>
    </div>
  );
}
