'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminConfirmDialog } from '@/components/admin/admin-ui';
import { StatusBadge, projectStatusLabel } from '@/components/admin/status-badge';
import { useAdminApi } from '@/hooks/use-admin';

export default function AdminProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const api = useAdminApi();
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.project(params.id).then((data) => { if (!cancelled) setProject(data); });
    return () => { cancelled = true; };
  }, [api, params.id]);

  const canClose = project?.status === 'OPEN' || project?.status === 'DRAFT';

  if (!project) return <div className="p-8 text-center">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{String(project.title)}</h1>
      <StatusBadge label={projectStatusLabel(String(project.status))} tone="info" />
      <div className="rounded-xl border bg-white p-6 text-sm space-y-2">
        <p>العميل: {String((project.client as { displayName?: string })?.displayName ?? '—')}</p>
        <p>التصنيف: {String((project.category as { nameAr?: string })?.nameAr ?? '—')}</p>
        <p>عدد العروض: {String(project.proposalCount)}</p>
        <p className="whitespace-pre-wrap">{String(project.description)}</p>
      </div>
      {canClose ? (
        <button type="button" onClick={() => setConfirmClose(true)} className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600">
          إغلاق المشروع
        </button>
      ) : null}
      <AdminConfirmDialog
        open={confirmClose}
        title="إغلاق المشروع"
        message="سيتم إغلاق المشروع ولن يقبل عروضاً جديدة."
        confirmLabel="إغلاق"
        isLoading={isLoading}
        onConfirm={() => {
          setIsLoading(true);
          void api.closeProject(params.id).then((updated) => {
            setProject(updated as Record<string, unknown>);
            setConfirmClose(false);
          }).finally(() => setIsLoading(false));
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}
