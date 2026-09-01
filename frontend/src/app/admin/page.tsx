'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const api = useAdminApi();
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.dashboard>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .dashboard()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setError('فشل تحميل الإحصائيات');
      });

    return () => {
      cancelled = true;
    };
  }, [api]);

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#0B132B]">لوحة التحكم</h1>
      <p className="mt-2 text-sm text-slate-500">مرحباً {user?.email}</p>

      {error ? <p className="mt-6 text-red-600">{error}</p> : null}

      {stats ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'إجمالي المستخدمين', value: stats.users.total },
            { label: 'المستقلون', value: stats.users.freelancers },
            { label: 'العملاء', value: stats.users.clients },
            { label: 'المستخدمون الموقوفون', value: stats.users.suspended + stats.users.banned },
            { label: 'إجمالي المشاريع', value: stats.projects.total },
            { label: 'المشاريع المفتوحة', value: stats.projects.open },
            { label: 'المشاريع قيد التنفيذ', value: stats.projects.inProgress },
            { label: 'المشاريع المكتملة', value: stats.projects.completed },
            { label: 'إجمالي العروض', value: stats.proposals.total },
            { label: 'إجمالي التقييمات', value: stats.reviews.total },
          ].map((card) => (
            <div key={card.label} className="rounded-xl border bg-white p-5">
              <p className="text-sm text-slate-500">{card.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#0B132B]">{card.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border bg-white" />
          ))}
        </div>
      )}
    </div>
  );
}
