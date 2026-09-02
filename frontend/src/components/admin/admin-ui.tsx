'use client';

import { useTranslations } from 'next-intl';

export function AdminPagination({
  page,
  totalPages,
  onChange,
  disabled,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('common');

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-3 pt-6">
      <button
        type="button"
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
      >
        {t('previous')}
      </button>
      <span className="text-sm text-slate-500">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded border px-3 py-1 text-sm disabled:opacity-50"
      >
        {t('next')}
      </button>
    </div>
  );
}

export function AdminSearch({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  const t = useTranslations('admin');

  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? t('search')}
      className="w-full max-w-sm rounded-lg border px-3 py-2 text-sm md:w-72"
    />
  );
}

export function AdminEmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-xl border bg-white p-8 text-center text-slate-500">{message}</p>
  );
}

export function AdminConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  isLoading,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations('common');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" onClick={onCancel} aria-label={t('close')} />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-on-surface">{title}</h3>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border px-4 py-2 text-sm">
            {t('cancel')}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? t('processing') : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
