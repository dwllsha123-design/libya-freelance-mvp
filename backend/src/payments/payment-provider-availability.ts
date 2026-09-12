import { ServiceUnavailableException } from '@nestjs/common';
import type { PaymentProvider } from './payment.types.js';

export const PAYMENT_PROVIDER_UNAVAILABLE = 'PAYMENT_PROVIDER_UNAVAILABLE';

export const PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE =
  'Online payment is currently unavailable.';

export const PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE_AR =
  'الدفع الإلكتروني غير متاح حالياً. سيتم تفعيله قريباً.';

/**
 * Fail closed before any Payment / purchase / subscription rows are created.
 * Used by Nuqati and subscription checkout when no real PSP is wired.
 */
export function assertPaymentProviderAvailable(provider: PaymentProvider): void {
  if (provider.capabilities.available) {
    return;
  }

  throw new ServiceUnavailableException({
    statusCode: 503,
    code: PAYMENT_PROVIDER_UNAVAILABLE,
    message: PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE,
    messageAr: PAYMENT_PROVIDER_UNAVAILABLE_MESSAGE_AR,
  });
}
