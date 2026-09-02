import type { AppLocale } from '@/i18n/routing';
import { apiRequest } from '@/lib/api';
import arPayments from '../../messages/ar/payments.json';
import enPayments from '../../messages/en/payments.json';

export type PaymentCaptureMode = 'sync' | 'redirect';

export interface PaymentConfig {
  provider: string;
  mode: PaymentCaptureMode;
  currency: string;
  requiresRedirect: boolean;
  supportsRefunds: boolean;
  available: boolean;
}

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  provider: 'simulated',
  mode: 'sync',
  currency: 'LYD',
  requiresRedirect: false,
  supportsRefunds: true,
  available: true,
};

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  try {
    return await apiRequest<PaymentConfig>('/platform/payment-config');
  } catch {
    return DEFAULT_PAYMENT_CONFIG;
  }
}

const PAYMENT_MODE_LABELS: Record<AppLocale, typeof arPayments> = {
  ar: arPayments,
  en: enPayments,
};

export function paymentModeLabel(config: PaymentConfig, locale: AppLocale = 'ar'): string {
  const labels = PAYMENT_MODE_LABELS[locale];

  if (config.provider === 'simulated') {
    return labels.modeSimulated;
  }
  if (config.requiresRedirect) {
    return labels.modeRedirect;
  }
  return labels.modeDefault;
}
