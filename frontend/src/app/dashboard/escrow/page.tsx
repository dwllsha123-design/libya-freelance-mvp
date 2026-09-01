'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { EscrowStatusCard } from '@/components/escrow/escrow-status-card';
import { useEscrowApi, type EscrowRecord } from '@/hooks/use-escrow';
import { PLATFORM_NAME_AR } from '@/lib/branding';

export default function DashboardEscrowPage() {
  const { user, isLoading: authLoading } = useAuth();
  const escrowApi = useEscrowApi();
  const [items, setItems] = useState<EscrowRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    escrowApi
      .listMine()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch(() => {
        if (!cancelled) setError('فشل تحميل سجل الضمان');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user, escrowApi]);

  if (authLoading || isLoading) {
    return <div className="p-8 text-center">جاري التحميل...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center">يرجى تسجيل الدخول</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold text-on-surface">سجل الضمان</h1>
      <p className="mt-2 text-on-surface-variant">
        معاملات الضمان على {PLATFORM_NAME_AR} — بالدينار الليبي
      </p>
      <p className="mt-2 text-sm">
        <Link href="/escrow" className="text-primary hover:underline">
          كيف يعمل نظام الضمان؟
        </Link>
      </p>

      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      {!error && items.length === 0 ? (
        <p className="mt-8 text-on-surface-variant">لا توجد معاملات ضمان بعد.</p>
      ) : null}

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="space-y-2">
            {item.project ? (
              <p className="font-medium text-on-surface">
                {item.project.title}{' '}
                <span className="text-sm text-on-surface-variant">({item.project.status})</span>
              </p>
            ) : null}
            <EscrowStatusCard escrow={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
