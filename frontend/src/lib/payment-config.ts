import { apiRequest } from '@/lib/api';

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

export function paymentModeLabel(config: PaymentConfig): string {
  if (config.provider === 'simulated') {
    return 'التمويل الحالي تجريبي (محاكاة) إلى حين ربط بوابة دفع ليبية.';
  }
  if (config.requiresRedirect) {
    return 'سيتم تحويلك إلى بوابة الدفع لإتمام العملية بأمان.';
  }
  return 'سيتم خصم المبلغ عبر بوابة الدفع المفعّلة.';
}
