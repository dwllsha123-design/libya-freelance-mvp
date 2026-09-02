import type { AppLocale } from '@/i18n/routing';

export const DEFAULT_CURRENCY = 'LYD';

function numberLocale(locale?: string): string {
  if (!locale) return 'ar-LY';
  return locale === 'en' ? 'en-LY' : 'ar-LY';
}

function currencyLabel(currency: string, locale?: string): string {
  if (currency === 'LYD') {
    return locale === 'en' ? 'LYD' : 'د.ل';
  }
  return currency;
}

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
  locale?: AppLocale | string,
): string {
  const formatted = amount.toLocaleString(numberLocale(locale), {
    maximumFractionDigits: 0,
  });

  return `${formatted} ${currencyLabel(currency, locale)}`;
}

export function formatBudgetRange(
  min: number,
  max: number,
  currency: string = DEFAULT_CURRENCY,
  locale?: AppLocale | string,
): string {
  if (min === max) {
    return formatCurrency(min, currency, locale);
  }
  return `${formatCurrency(min, currency, locale)} – ${formatCurrency(max, currency, locale)}`;
}
