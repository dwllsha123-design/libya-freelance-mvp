export const DEFAULT_CURRENCY = 'LYD';
export const CURRENCY_LABEL_AR = 'د.ل';

export function formatCurrency(
  amount: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  const formatted = amount.toLocaleString('ar-LY', {
    maximumFractionDigits: 0,
  });

  if (currency === 'LYD') {
    return `${formatted} ${CURRENCY_LABEL_AR}`;
  }

  return `${formatted} ${currency}`;
}

export function formatBudgetRange(
  min: number,
  max: number,
  currency: string = DEFAULT_CURRENCY,
): string {
  if (min === max) {
    return formatCurrency(min, currency);
  }
  return `${formatCurrency(min, currency)} – ${formatCurrency(max, currency)}`;
}
