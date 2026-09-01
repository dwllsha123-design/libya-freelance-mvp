'use client';

import { useEffect, useState } from 'react';
import {
  DEFAULT_PAYMENT_CONFIG,
  fetchPaymentConfig,
  type PaymentConfig,
} from '@/lib/payment-config';

export function usePaymentConfig() {
  const [config, setConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const data = await fetchPaymentConfig();
      if (!cancelled) {
        setConfig(data);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { config, isLoading };
}
