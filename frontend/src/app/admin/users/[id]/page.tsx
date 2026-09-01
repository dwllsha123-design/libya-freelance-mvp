'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/admin-ui';
import { StatusBadge, userStatusTone } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const api = useAdminApi();
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [pending, setPending] = useState<'suspend' | 'ban' | 'reactivate' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    api.user(params.id).then((data) => {
      if (!cancelled) setUser(data);
    });

    return () => {
      cancelled = true;
    };
  }, [api, params.id]);

  async function runAction() {
    if (!pending) return;
    setIsLoading(true);
    try {
      if (pending === 'suspend') await api.suspendUser(params.id);
      if (pending === 'ban') await api.banUser(params.id);
      if (pending === 'reactivate') await api.reactivateUser(params.id);
      const updated = await api.user(params.id);
      setUser(updated);
      setPending(null);
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{String(user.displayName)}</h1>
      <div className="rounded-xl border bg-white p-6 space-y-2 text-sm">
        <p>البريد: {String(user.email)}</p>
        <p>اسم المستخدم: @{String(user.username)}</p>
        <p>الدور: {String(user.role)}</p>
        <p>
          الحالة:{' '}
          <StatusBadge label={String(user.status)} tone={userStatusTone(String(user.status))} />
        </p>
        <p>تاريخ الانضمام: {new Date(String(user.createdAt)).toLocaleDateString('ar-LY')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {user.status !== 'SUSPENDED' ? (
          <button type="button" onClick={() => setPending('suspend')} className="rounded-lg border px-4 py-2 text-sm">
            تعليق الحساب
          </button>
        ) : null}
        {user.status !== 'BANNED' ? (
          <button type="button" onClick={() => setPending('ban')} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600">
            حظر الحساب
          </button>
        ) : null}
        {user.status !== 'ACTIVE' ? (
          <button type="button" onClick={() => setPending('reactivate')} className="rounded-lg bg-primary px-4 py-2 text-sm text-white">
            إعادة التفعيل
          </button>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={pending !== null}
        title={pending === 'ban' ? 'حظر الحساب' : pending === 'suspend' ? 'تعليق الحساب' : 'إعادة التفعيل'}
        message="هل أنت متأكد من تنفيذ هذا الإجراء؟"
        confirmLabel="تأكيد"
        isLoading={isLoading}
        onConfirm={() => void runAction()}
        onCancel={() => setPending(null)}
      />
    </div>
  );
}
