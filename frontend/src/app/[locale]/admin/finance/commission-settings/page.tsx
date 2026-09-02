'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';

/** Legacy path → canonical commission control */
export default function CommissionSettingsRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin/finance/commission');
  }, [router]);
  return null;
}
