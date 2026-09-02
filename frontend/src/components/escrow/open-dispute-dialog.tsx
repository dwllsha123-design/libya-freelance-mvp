'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConfirmDialog } from '@/components/projects/confirm-dialog';

export function OpenDisputeDialog({
  open,
  isLoading = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
}) {
  const t = useTranslations('escrow');
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      title={t('disputeDialogTitle')}
      message={
        <div className="space-y-2">
          <p>{t('disputeDialogBody')}</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={t('disputeReasonPlaceholder')}
          />
        </div>
      }
      confirmLabel={t('submitDispute')}
      variant="danger"
      isLoading={isLoading}
      onConfirm={() => {
        if (reason.trim().length >= 10) void onSubmit(reason.trim());
      }}
      onCancel={handleClose}
    />
  );
}
