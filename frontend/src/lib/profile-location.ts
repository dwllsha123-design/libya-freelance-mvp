/** Countries available on the profile edit form. Values match Profile.country. */
export const PROFILE_COUNTRIES = [
  { value: 'Libya', nameAr: 'ليبيا', nameEn: 'Libya', flag: '🇱🇾' },
  { value: 'Netherlands', nameAr: 'هولندا', nameEn: 'Netherlands', flag: '🇳🇱' },
  { value: 'Tunisia', nameAr: 'تونس', nameEn: 'Tunisia', flag: '🇹🇳' },
  { value: 'Egypt', nameAr: 'مصر', nameEn: 'Egypt', flag: '🇪🇬' },
  { value: 'Algeria', nameAr: 'الجزائر', nameEn: 'Algeria', flag: '🇩🇿' },
  { value: 'Morocco', nameAr: 'المغرب', nameEn: 'Morocco', flag: '🇲🇦' },
  { value: 'Other', nameAr: 'أخرى', nameEn: 'Other', flag: '🌍' },
] as const;

export type ProfileCountryValue = (typeof PROFILE_COUNTRIES)[number]['value'];

const COUNTRY_ALIASES: Record<string, ProfileCountryValue> = {
  ly: 'Libya',
  libya: 'Libya',
  'ليبيا': 'Libya',
  nl: 'Netherlands',
  netherlands: 'Netherlands',
  holland: 'Netherlands',
  'هولندا': 'Netherlands',
  'هولاندا': 'Netherlands',
  tn: 'Tunisia',
  tunisia: 'Tunisia',
  'تونس': 'Tunisia',
  eg: 'Egypt',
  egypt: 'Egypt',
  'مصر': 'Egypt',
  dz: 'Algeria',
  algeria: 'Algeria',
  'الجزائر': 'Algeria',
  ma: 'Morocco',
  morocco: 'Morocco',
  'المغرب': 'Morocco',
  other: 'Other',
  'أخرى': 'Other',
};

/** Resolve a stored Profile.country string to its flag emoji. */
export function getCountryFlag(country?: string | null): string | null {
  if (!country?.trim()) return null;

  const exact = PROFILE_COUNTRIES.find((c) => c.value === country);
  if (exact) return exact.flag;

  const alias = COUNTRY_ALIASES[country.trim().toLowerCase()];
  if (alias) {
    return PROFILE_COUNTRIES.find((c) => c.value === alias)?.flag ?? null;
  }

  return null;
}

export function getCountryLabel(
  country: string | null | undefined,
  locale: 'ar' | 'en',
): string | null {
  if (!country?.trim()) return null;

  const exact = PROFILE_COUNTRIES.find((c) => c.value === country);
  if (exact) return locale === 'en' ? exact.nameEn : exact.nameAr;

  const alias = COUNTRY_ALIASES[country.trim().toLowerCase()];
  if (alias) {
    const match = PROFILE_COUNTRIES.find((c) => c.value === alias);
    if (match) return locale === 'en' ? match.nameEn : match.nameAr;
  }

  return country;
}

/** Cities for a country: matching country rows, plus remote (available everywhere). */
export function filterCitiesForCountry<
  T extends { country?: string | null; isRemote?: boolean },
>(cities: T[], country?: string | null): T[] {
  const selected = country?.trim() || 'Libya';

  if (selected === 'Other') {
    return cities.filter((city) => city.isRemote);
  }

  return cities.filter((city) => {
    if (city.isRemote) return true;
    const cityCountry = city.country?.trim() || 'Libya';
    return cityCountry === selected;
  });
}
