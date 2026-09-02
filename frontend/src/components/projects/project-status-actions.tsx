'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ApiError } from '@/lib/api';
import type { ManageProject } from '@/lib/schemas/project';
import { ConfirmDialog } from './confirm-dialog';

interface ProjectStatusActionsProps {
  project: ManageProject;
  onClose: (id: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdated?: () => void;
  compact?: boolean;
}

type PendingAction = 'close' | 'cancel' | 'delete' | null;

export function ProjectStatusActions({
  project,
  onClose,
  onCancel,
  onDelete,
  onUpdated,
  compact = false,
}: ProjectStatusActionsProps) {
  const t = useTranslations('projects');
  const tCommon = useTranslations('common');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function executeAction() {
    if (!pendingAction) return;

    setIsLoading(true);
    setError(null);

    try {
      if (pendingAction === 'close') await onClose(project.id);
      if (pendingAction === 'cancel') await onCancel(project.id);
      if (pendingAction === 'delete') await onDelete(project.id);
      setPendingAction(null);
      onUpdated?.();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : t('actionFailed');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  const canEdit = project.status === 'DRAFT' || project.status === 'OPEN';
  const canDelete = project.status === 'DRAFT';
  const canClose = project.status === 'OPEN';
  const canCancel =
    project.status === 'DRAFT' || project.status === 'OPEN';

  if (
    project.status === 'CLOSED' ||
    project.status === 'CANCELLED' ||
    project.status === 'IN_PROGRESS' ||
    project.status === 'COMPLETED'
  ) {
    if (project.status === 'CLOSED' || project.status === 'CANCELLED') {
      return compact ? null : (
        <p className="text-sm text-slate-500">{t('noActionsAvailable')}</p>
      );
    }
    return null;
  }

  const btnClass = compact
    ? 'rounded-lg border px-3 py-1.5 text-sm'
    : 'rounded-lg border px-4 py-2 text-sm';

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canClose ? (
          <button
            type="button"
            className={btnClass}
            onClick={() => setPendingAction('close')}
          >
            {t('close')}
          </button>
        ) : null}
        {canCancel ? (
          <button
            type="button"
            className={`${btnClass} text-red-600`}
            onClick={() => setPendingAction('cancel')}
          >
            {tCommon('cancel')}
          </button>
        ) : null}
        {canDelete ? (
          <button
            type="button"
            className={`${btnClass} text-red-600`}
            onClick={() => setPendingAction('delete')}
          >
            {tCommon('delete')}
          </button>
        ) : null}
        {!canEdit && !canDelete && !canClose && !canCancel ? (
          <span className="text-sm text-slate-500">{t('readOnly')}</span>
        ) : null}
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <ConfirmDialog
        open={pendingAction === 'close'}
        title={t('closeProject')}
        message={t('closeProjectConfirm')}
        confirmLabel={t('closeProjectAction')}
        variant="danger"
        isLoading={isLoading}
        onConfirm={() => void executeAction()}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={pendingAction === 'cancel'}
        title={t('cancelProject')}
        message={t('cancelProjectConfirm')}
        confirmLabel={t('cancelProjectAction')}
        variant="danger"
        isLoading={isLoading}
        onConfirm={() => void executeAction()}
        onCancel={() => setPendingAction(null)}
      />

      <ConfirmDialog
        open={pendingAction === 'delete'}
        title={t('deleteDraft')}
        message={t('deleteDraftConfirm')}
        confirmLabel={tCommon('delete')}
        variant="danger"
        isLoading={isLoading}
        onConfirm={() => void executeAction()}
        onCancel={() => setPendingAction(null)}
      />
    </>
  );
}
