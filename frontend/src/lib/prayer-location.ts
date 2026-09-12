export type PrayerLocationPreference = {
  countryCode: string;
  country: string;
  city: string;
  cityAr?: string;
  countryAr?: string;
  latitude: number;
  longitude: number;
  timezone: string;
  source: 'MANUAL' | 'IP' | 'PROFILE' | 'DEFAULT' | 'TIMEZONE' | 'HEADER';
  savedAt: string;
};

export type ResolvedLocationDto = {
  countryCode: string;
  country: string;
  city: string;
  region: string | null;
  latitude: number;
  longitude: number;
  timezone: string;
  source: string;
};

export type PrayerCityDto = {
  countryCode: string;
  country: string;
  countryAr: string;
  city: string;
  cityAr: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

const STORAGE_KEY = 'lf.prayerLocation.v1';
const TIMES_CACHE_PREFIX = 'lf.prayerTimes.v1:';

export function loadSavedPrayerLocation(
  userId?: string | null,
): PrayerLocationPreference | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PrayerLocationPreference;
    if (
      !parsed?.city ||
      typeof parsed.latitude !== 'number' ||
      typeof parsed.longitude !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function savePrayerLocation(
  pref: Omit<PrayerLocationPreference, 'savedAt'> & { savedAt?: string },
  userId?: string | null,
) {
  if (typeof window === 'undefined') return;
  const value: PrayerLocationPreference = {
    ...pref,
    savedAt: pref.savedAt ?? new Date().toISOString(),
  };
  window.localStorage.setItem(storageKey(userId), JSON.stringify(value));
}

function storageKey(userId?: string | null) {
  return userId ? `${STORAGE_KEY}:user:${userId}` : `${STORAGE_KEY}:guest`;
}

export function prayerTimesCacheKey(loc: {
  latitude: number;
  longitude: number;
  date: string;
}) {
  return `${TIMES_CACHE_PREFIX}${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}:${loc.date}`;
}

export function loadCachedPrayerTimes(key: string): Record<string, string> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { expiresAt: number; timings: Record<string, string> };
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    return parsed.timings;
  } catch {
    return null;
  }
}

export function saveCachedPrayerTimes(
  key: string,
  timings: Record<string, string>,
  ttlMs = 12 * 60 * 60 * 1000,
) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    key,
    JSON.stringify({ expiresAt: Date.now() + ttlMs, timings }),
  );
}

/** Map browser timezone to a known city when IP resolve is unavailable. */
export function locationFromTimezone(
  timeZone: string,
): PrayerLocationPreference | null {
  const map: Record<string, Omit<PrayerLocationPreference, 'savedAt' | 'source'>> = {
    'Africa/Tripoli': {
      countryCode: 'LY',
      country: 'Libya',
      city: 'Tripoli',
      cityAr: 'طرابلس',
      countryAr: 'ليبيا',
      latitude: 32.8872,
      longitude: 13.1913,
      timezone: 'Africa/Tripoli',
    },
    'Africa/Cairo': {
      countryCode: 'EG',
      country: 'Egypt',
      city: 'Cairo',
      cityAr: 'القاهرة',
      countryAr: 'مصر',
      latitude: 30.0444,
      longitude: 31.2357,
      timezone: 'Africa/Cairo',
    },
  };
  const hit = map[timeZone];
  if (!hit) return null;
  return { ...hit, source: 'TIMEZONE', savedAt: new Date().toISOString() };
}

export function formatLocationLabel(
  loc: { city: string; cityAr?: string; country: string; countryAr?: string },
  locale: string,
) {
  const city = locale === 'ar' ? loc.cityAr || loc.city : loc.city;
  const country = locale === 'ar' ? loc.countryAr || loc.country : loc.country;
  return `${city}، ${country}`;
}

/**
 * Fetch Aladhan timings WITHOUT changing method params (preserve prior convention).
 */
export async function fetchAladhanTimings(loc: {
  latitude: number;
  longitude: number;
}): Promise<Record<string, string>> {
  const url = `https://api.aladhan.com/v1/timings?latitude=${loc.latitude}&longitude=${loc.longitude}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`aladhan ${res.status}`);
  const data = (await res.json()) as {
    data?: { timings?: Record<string, string> };
  };
  if (!data.data?.timings) throw new Error('aladhan empty');
  return data.data.timings;
}
