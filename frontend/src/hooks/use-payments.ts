'use client';

import { useLocale } from 'next-intl';
import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { authenticatedRequest, getApiErrorMessage } from '@/lib/api';
import type { AppLocale } from '@/i18n/routing';

export interface PaymentRecord {
  id: string;
  escrowId: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  providerReference?: string | null;
  checkoutUrl?: string | null;
  failureMessage?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InitiatePaymentResult {
  paymentId: string;
  status: string;
  provider: string;
  checkoutUrl?: string | null;
  requiresRedirect: boolean;
}

export function usePaymentsApi() {
  const { accessToken } = useAuth();
  const locale = useLocale() as AppLocale;

  return useMemo(
    () => ({
      initiateEscrowFunding: (
        escrowId: string,
        body: { returnUrl?: string; cancelUrl?: string } = {},
      ) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<InitiatePaymentResult>(
          `/payments/escrow/${escrowId}/initiate`,
          accessToken,
          { method: 'POST', body: JSON.stringify(body) },
        );
      },
      getPayment: (paymentId: string) => {
        if (!accessToken) throw new Error(getApiErrorMessage(locale, 'unauthorized'));
        return authenticatedRequest<PaymentRecord>(`/payments/${paymentId}`, accessToken);
      },
    }),
    [accessToken, locale],
  );
}
