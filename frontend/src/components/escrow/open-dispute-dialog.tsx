'use client';

import { useState } from 'react';
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
  const [reason, setReason] = useState('');

  function handleClose() {
    setReason('');
    onClose();
  }

  return (
    <ConfirmDialog
      open={open}
      title="فتح نزاع على الضمان"
      message={
        <div className="space-y-2">
          <p>صف المشكلة بوضوح. سيتم تجميد المبلغ حتى مراجعة الإدارة.</p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="سبب النزاع..."
          />
        </div>
      }
      confirmLabel="إرسال النزاع"
      variant="danger"
      isLoading={isLoading}
      onConfirm={() => {
        if (reason.trim().length >= 10) void onSubmit(reason.trim());
      }}
      onCancel={handleClose}
    />
  );
}
