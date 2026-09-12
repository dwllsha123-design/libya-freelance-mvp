import type { PrayerCityOption } from './location.types.js';

/**
 * Curated prayer-location catalog (approximate city centers).
 * Used to normalize IP/city results and power the manual city picker.
 */
export const PRAYER_CITY_CATALOG: PrayerCityOption[] = [
  {
    countryCode: 'LY',
    country: 'Libya',
    countryAr: 'ليبيا',
    city: 'Tripoli',
    cityAr: 'طرابلس',
    latitude: 32.8872,
    longitude: 13.1913,
    timezone: 'Africa/Tripoli',
  },
  {
    countryCode: 'LY',
    country: 'Libya',
    countryAr: 'ليبيا',
    city: 'Benghazi',
    cityAr: 'بنغازي',
    latitude: 32.1167,
    longitude: 20.0667,
    timezone: 'Africa/Tripoli',
  },
  {
    countryCode: 'LY',
    country: 'Libya',
    countryAr: 'ليبيا',
    city: 'Misrata',
    cityAr: 'مصراتة',
    latitude: 32.377,
    longitude: 15.092,
    timezone: 'Africa/Tripoli',
  },
  {
    countryCode: 'LY',
    country: 'Libya',
    countryAr: 'ليبيا',
    city: 'Sabha',
    cityAr: 'سبها',
    latitude: 27.0377,
    longitude: 14.4283,
    timezone: 'Africa/Tripoli',
  },
  {
    countryCode: 'LY',
    country: 'Libya',
    countryAr: 'ليبيا',
    city: 'Zawiya',
    cityAr: 'الزاوية',
    latitude: 32.7571,
    longitude: 12.7278,
    timezone: 'Africa/Tripoli',
  },
  {
    countryCode: 'TN',
    country: 'Tunisia',
    countryAr: 'تونس',
    city: 'Tunis',
    cityAr: 'تونس',
    latitude: 36.8065,
    longitude: 10.1815,
    timezone: 'Africa/Tunis',
  },
  {
    countryCode: 'EG',
    country: 'Egypt',
    countryAr: 'مصر',
    city: 'Cairo',
    cityAr: 'القاهرة',
    latitude: 30.0444,
    longitude: 31.2357,
    timezone: 'Africa/Cairo',
  },
  {
    countryCode: 'SA',
    country: 'Saudi Arabia',
    countryAr: 'السعودية',
    city: 'Riyadh',
    cityAr: 'الرياض',
    latitude: 24.7136,
    longitude: 46.6753,
    timezone: 'Asia/Riyadh',
  },
  {
    countryCode: 'AE',
    country: 'United Arab Emirates',
    countryAr: 'الإمارات',
    city: 'Dubai',
    cityAr: 'دبي',
    latitude: 25.2048,
    longitude: 55.2708,
    timezone: 'Asia/Dubai',
  },
  {
    countryCode: 'TR',
    country: 'Turkey',
    countryAr: 'تركيا',
    city: 'Istanbul',
    cityAr: 'إسطنبول',
    latitude: 41.0082,
    longitude: 28.9784,
    timezone: 'Europe/Istanbul',
  },
  {
    countryCode: 'GB',
    country: 'United Kingdom',
    countryAr: 'المملكة المتحدة',
    city: 'London',
    cityAr: 'لندن',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
  },
  {
    countryCode: 'US',
    country: 'United States',
    countryAr: 'الولايات المتحدة',
    city: 'New York',
    cityAr: 'نيويورك',
    latitude: 40.7128,
    longitude: -74.006,
    timezone: 'America/New_York',
  },
];

export const DEFAULT_PRAYER_LOCATION = PRAYER_CITY_CATALOG[0]!;

const TIMEZONE_TO_CITY: Record<string, string> = {
  'Africa/Tripoli': 'Tripoli',
  'Africa/Cairo': 'Cairo',
  'Africa/Tunis': 'Tunis',
  'Asia/Riyadh': 'Riyadh',
  'Asia/Dubai': 'Dubai',
  'Europe/Istanbul': 'Istanbul',
  'Europe/London': 'London',
  'America/New_York': 'New York',
};

export function findCatalogCity(input: {
  countryCode?: string | null;
  city?: string | null;
  timezone?: string | null;
}): PrayerCityOption | null {
  const country = input.countryCode?.trim().toUpperCase();
  const city = input.city?.trim().toLowerCase();

  if (country && city) {
    const exact = PRAYER_CITY_CATALOG.find(
      (c) =>
        c.countryCode === country &&
        (c.city.toLowerCase() === city ||
          c.cityAr === input.city?.trim() ||
          c.city.toLowerCase().includes(city) ||
          city.includes(c.city.toLowerCase())),
    );
    if (exact) return exact;
  }

  if (country) {
    const capital = PRAYER_CITY_CATALOG.find((c) => c.countryCode === country);
    if (capital) return capital;
  }

  if (input.timezone) {
    const mappedCity = TIMEZONE_TO_CITY[input.timezone];
    if (mappedCity) {
      return (
        PRAYER_CITY_CATALOG.find((c) => c.city === mappedCity) ?? null
      );
    }
  }

  return null;
}

export function listCountriesFromCatalog() {
  const seen = new Map<string, { countryCode: string; country: string; countryAr: string }>();
  for (const c of PRAYER_CITY_CATALOG) {
    if (!seen.has(c.countryCode)) {
      seen.set(c.countryCode, {
        countryCode: c.countryCode,
        country: c.country,
        countryAr: c.countryAr,
      });
    }
  }
  return [...seen.values()];
}

export function listCitiesForCountry(countryCode: string) {
  const code = countryCode.trim().toUpperCase();
  return PRAYER_CITY_CATALOG.filter((c) => c.countryCode === code);
}
