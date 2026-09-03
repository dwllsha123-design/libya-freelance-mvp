'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const PRAYERS = [
  { id: 'Fajr', nameAr: 'الفجر', nameEn: 'Fajr' },
  { id: 'Dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr' },
  { id: 'Asr', nameAr: 'العصر', nameEn: 'Asr' },
  { id: 'Maghrib', nameAr: 'المغرب', nameEn: 'Maghrib' },
  { id: 'Isha', nameAr: 'العشاء', nameEn: 'Isha' },
] as const;

function formatTime(time24: string, locale: string) {
  if (!time24) return '--:--';
  const [hours, minutes] = time24.split(':');
  const h = parseInt(hours, 10);
  if (locale === 'ar') {
    const ampm = h >= 12 ? 'م' : 'ص';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes} ${ampm}`;
  }
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${minutes} ${ampm}`;
}

export function PrayerTimes() {
  const t = useTranslations('home');
  const locale = useLocale();
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFallback = async () => {
      try {
        const res = await fetch(
          'https://api.aladhan.com/v1/timingsByCity?city=Tripoli&country=Libya',
        );
        const data = await res.json();
        setTimes(data.data.timings);
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };

    if (!navigator.geolocation) {
      void fetchFallback();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://api.aladhan.com/v1/timings?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}`,
          );
          const data = await res.json();
          setTimes(data.data.timings);
        } catch {
          await fetchFallback();
          return;
        } finally {
          setLoading(false);
        }
      },
      () => {
        void fetchFallback();
      },
    );
  }, []);

  if (loading) {
    return (
      <div className="mx-auto mt-8 max-w-6xl">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-cream-deep/40" />
      </div>
    );
  }

  if (!times) return null;

  return (
    <div className="mx-auto mt-8 max-w-6xl">
      <div className="flex flex-col items-center justify-between gap-6 rounded-2xl border border-line/70 bg-cream/80 p-5 shadow-[0_8px_24px_-16px_rgba(21,32,60,0.3)] backdrop-blur-md transition-all hover:border-ember/30 md:flex-row">
        <div className="flex items-center gap-4">
          <div className="grid size-12 place-items-center rounded-full bg-palm/10 text-xl text-palm-deep">
            🕌
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              {t('prayerTimesTitle')}
            </h3>
            <p className="mt-0.5 text-xs text-ink-soft">{t('prayerTimesSubtitle')}</p>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center justify-center gap-4 md:w-auto md:gap-8">
          {PRAYERS.map((p) => (
            <div key={p.id} className="flex-1 text-center md:flex-none">
              <div className="mb-1 text-xs font-medium text-ink-soft">
                {locale === 'ar' ? p.nameAr : p.nameEn}
              </div>
              <div className="rounded-lg border border-line/50 bg-cream-deep/50 px-3 py-1.5 font-mono text-sm font-bold text-ink">
                {formatTime(times[p.id] || '', locale)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
