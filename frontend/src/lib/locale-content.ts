import type { AppLocale } from '@/i18n/routing';

export function getLocalizedCityName(
  city: { nameAr: string; nameEn?: string },
  locale: AppLocale,
): string {
  return locale === 'en' && city.nameEn ? city.nameEn : city.nameAr;
}

export function getLocalizedCategoryName(
  category: { nameAr: string; nameEn?: string },
  locale: AppLocale,
): string {
  return locale === 'en' && category.nameEn ? category.nameEn : category.nameAr;
}

export function getLocalizedDescription(
  item: { description: string; descriptionEn?: string },
  locale: AppLocale,
): string {
  return locale === 'en' && item.descriptionEn ? item.descriptionEn : item.description;
}
