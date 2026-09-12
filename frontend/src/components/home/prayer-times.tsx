'use client';

import { useEffect, useId, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/auth-context';
import { API_BASE_URL, CLIENT_REQUEST_HEADER, CLIENT_REQUEST_VALUE } from '@/lib/api';
import {
  fetchAladhanTimings,
  formatLocationLabel,
  loadCachedPrayerTimes,
  loadSavedPrayerLocation,
  locationFromTimezone,
  prayerTimesCacheKey,
  saveCachedPrayerTimes,
  savePrayerLocation,
  type PrayerCityDto,
  type PrayerLocationPreference,
  type ResolvedLocationDto,
} from '@/lib/prayer-location';

const PRAYERS = [
  { id: 'Fajr', nameAr: 'الفجر', nameEn: 'Fajr' },
  { id: 'Dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr' },
  { id: 'Asr', nameAr: 'العصر', nameEn: 'Asr' },
  { id: 'Maghrib', nameAr: 'المغرب', nameEn: 'Maghrib' },
  { id: 'Isha', nameAr: 'العشاء', nameEn: 'Isha' },
] as const;

const DEFAULT_LOCATION: PrayerLocationPreference = {
  countryCode: 'LY',
  country: 'Libya',
  countryAr: 'ليبيا',
  city: 'Tripoli',
  cityAr: 'طرابلس',
  latitude: 32.8872,
  longitude: 13.1913,
  timezone: 'Africa/Tripoli',
  source: 'DEFAULT',
  savedAt: new Date(0).toISOString(),
};

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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { [CLIENT_REQUEST_HEADER]: CLIENT_REQUEST_VALUE },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`api ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * Prayer times card — never auto-calls navigator.geolocation.
 * Location priority: saved manual → IP resolve → timezone → Tripoli default.
 */
export function PrayerTimes() {
  const t = useTranslations('home');
  const locale = useLocale();
  const { user } = useAuth();
  const dialogTitleId = useId();

  const [location, setLocation] = useState<PrayerLocationPreference | null>(null);
  const [times, setTimes] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [countries, setCountries] = useState<
    Array<{ countryCode: string; country: string; countryAr: string }>
  >([]);
  const [cities, setCities] = useState<PrayerCityDto[]>([]);
  const [draftCountry, setDraftCountry] = useState('LY');
  const [draftCity, setDraftCity] = useState('Tripoli');
  const [preciseBusy, setPreciseBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function resolveLocation(): Promise<PrayerLocationPreference> {
      const saved = loadSavedPrayerLocation(user?.id);
      if (saved?.source === 'MANUAL' || saved?.source === 'PROFILE') {
        return saved;
      }

      try {
        const resolved = await apiGet<ResolvedLocationDto>('/location/resolve');
        const catalogCities = await apiGet<PrayerCityDto[]>(
          `/location/cities?countryCode=${encodeURIComponent(resolved.countryCode)}`,
        );
        const match =
          catalogCities.find(
            (c) => c.city.toLowerCase() === resolved.city.toLowerCase(),
          ) ?? catalogCities[0];

        return {
          countryCode: resolved.countryCode,
          country: match?.country ?? resolved.country,
          countryAr: match?.countryAr,
          city: match?.city ?? resolved.city,
          cityAr: match?.cityAr,
          latitude: resolved.latitude,
          longitude: resolved.longitude,
          timezone: resolved.timezone,
          source:
            resolved.source === 'IP' ||
            resolved.source === 'HEADER' ||
            resolved.source === 'DEFAULT'
              ? (resolved.source as PrayerLocationPreference['source'])
              : 'IP',
          savedAt: new Date().toISOString(),
        };
      } catch {
        /* fall through */
      }

      try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const fromTz = locationFromTimezone(tz);
        if (fromTz) return fromTz;
      } catch {
        /* fall through */
      }

      return DEFAULT_LOCATION;
    }

    async function load() {
      setLoading(true);
      const loc = await resolveLocation();
      if (cancelled) return;
      setLocation(loc);

      const cacheKey = prayerTimesCacheKey({
        latitude: loc.latitude,
        longitude: loc.longitude,
        date: todayKey(),
      });
      const cached = loadCachedPrayerTimes(cacheKey);
      if (cached) {
        setTimes(cached);
        setLoading(false);
        return;
      }

      try {
        const timings = await fetchAladhanTimings(loc);
        if (cancelled) return;
        setTimes(timings);
        saveCachedPrayerTimes(cacheKey, timings);
      } catch {
        if (!cancelled) setTimes(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<
          Array<{ countryCode: string; country: string; countryAr: string }>
        >('/location/countries');
        if (!cancelled) setCountries(list);
      } catch {
        if (!cancelled) {
          setCountries([
            { countryCode: 'LY', country: 'Libya', countryAr: 'ليبيا' },
          ]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen]);

  useEffect(() => {
    if (!pickerOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await apiGet<PrayerCityDto[]>(
          `/location/cities?countryCode=${encodeURIComponent(draftCountry)}`,
        );
        if (cancelled) return;
        setCities(list);
        setDraftCity((current) =>
          list.some((c) => c.city === current) ? current : list[0]?.city ?? current,
        );
      } catch {
        if (!cancelled) setCities([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickerOpen, draftCountry]);

  async function applyLocation(next: PrayerLocationPreference) {
    setLocation(next);
    savePrayerLocation(next, user?.id);
    setLoading(true);
    try {
      const cacheKey = prayerTimesCacheKey({
        latitude: next.latitude,
        longitude: next.longitude,
        date: todayKey(),
      });
      const timings = await fetchAladhanTimings(next);
      setTimes(timings);
      saveCachedPrayerTimes(cacheKey, timings);
    } catch {
      setTimes(null);
    } finally {
      setLoading(false);
    }
  }

  function openPicker() {
    setDraftCountry(location?.countryCode ?? 'LY');
    setDraftCity(location?.city ?? 'Tripoli');
    setPickerOpen(true);
  }

  async function confirmManualCity() {
    const selected =
      cities.find((c) => c.city === draftCity) ??
      cities.find((c) => c.countryCode === draftCountry);
    if (!selected) {
      setPickerOpen(false);
      return;
    }
    await applyLocation({
      countryCode: selected.countryCode,
      country: selected.country,
      countryAr: selected.countryAr,
      city: selected.city,
      cityAr: selected.cityAr,
      latitude: selected.latitude,
      longitude: selected.longitude,
      timezone: selected.timezone,
      source: 'MANUAL',
      savedAt: new Date().toISOString(),
    });
    setPickerOpen(false);
  }

  /**
   * OPTIONAL explicit precise location — only after user click.
   * Must never run on page load.
   */
  function usePreciseLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setPreciseBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await applyLocation({
            countryCode: location?.countryCode ?? 'LY',
            country: location?.country ?? 'Libya',
            countryAr: location?.countryAr,
            city: location?.city ?? 'GPS',
            cityAr: location?.cityAr,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            timezone:
              location?.timezone ??
              Intl.DateTimeFormat().resolvedOptions().timeZone,
            source: 'MANUAL',
            savedAt: new Date().toISOString(),
          });
        } finally {
          setPreciseBusy(false);
          setPickerOpen(false);
        }
      },
      () => {
        setPreciseBusy(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  if (loading && !times) {
    return (
      <div className="mx-auto mt-8 max-w-6xl">
        <div className="h-24 animate-pulse rounded-2xl border border-line bg-cream-deep/40" />
      </div>
    );
  }

  if (!times || !location) return null;

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
            <p className="mt-0.5 text-xs text-ink-soft">
              {formatLocationLabel(location, locale)}
            </p>
            <button
              type="button"
              onClick={openPicker}
              className="mt-1 text-xs font-semibold text-primary hover:underline"
            >
              {t('prayerChangeCity')}
            </button>
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

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby={dialogTitleId}
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-cream p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id={dialogTitleId} className="font-display text-lg font-semibold text-ink">
              {t('prayerChangeCity')}
            </h4>
            <p className="mt-1 text-xs text-ink-soft">{t('prayerChangeCityHint')}</p>

            <label className="mt-4 block text-xs font-medium text-ink-soft">
              {t('prayerCountry')}
              <select
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
                value={draftCountry}
                onChange={(e) => setDraftCountry(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c.countryCode} value={c.countryCode}>
                    {locale === 'ar' ? c.countryAr : c.country}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-3 block text-xs font-medium text-ink-soft">
              {t('prayerCity')}
              <select
                className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink"
                value={draftCity}
                onChange={(e) => setDraftCity(e.target.value)}
              >
                {cities.map((c) => (
                  <option key={`${c.countryCode}-${c.city}`} value={c.city}>
                    {locale === 'ar' ? c.cityAr : c.city}
                  </option>
                ))}
              </select>
            </label>

            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void confirmManualCity()}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                {t('prayerSaveCity')}
              </button>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-lg border border-line px-4 py-2 text-sm text-ink"
              >
                {t('prayerCancel')}
              </button>
              <button
                type="button"
                disabled={preciseBusy}
                onClick={usePreciseLocation}
                className="ms-auto text-xs text-ink-soft underline-offset-2 hover:underline disabled:opacity-50"
              >
                {t('prayerUsePrecise')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
