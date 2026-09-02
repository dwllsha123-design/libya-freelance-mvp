'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import type { ProjectListItem } from '@/lib/schemas/project';

interface ProposalFormModalProps {
  project: ProjectListItem;
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    coverLetter: string;
    proposedPrice: number;
    estimatedDurationDays: number;
  }) => Promise<void>;
}

export function ProposalFormModal({
  project,
  open,
  isSubmitting,
  onClose,
  onSubmit,
}: ProposalFormModalProps) {
  const t = useTranslations('proposals');
  const tCommon = useTranslations('common');
  const [coverLetter, setCoverLetter] = useState('');
  const [proposedPrice, setProposedPrice] = useState(
    String(project.budgetMin),
  );
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('14');
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = Number(proposedPrice);
    const days = Number(estimatedDurationDays);

    if (coverLetter.trim().length < 50) {
      setError(t('coverLetterMin'));
      return;
    }

    if (price <= 0) {
      setError(t('pricePositive'));
      return;
    }

    if (!Number.isInteger(days) || days < 1 || days > 365) {
      setError(t('durationRange'));
      return;
    }

    try {
      await onSubmit({
        coverLetter: coverLetter.trim(),
        proposedPrice: price,
        estimatedDurationDays: days,
      });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('submitFailed'),
      );
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={tCommon('closeDialog')}
        onClick={onClose}
      />
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-xl font-bold text-on-surface">{t('submit')}</h2>
        <p className="mt-1 text-sm text-slate-600">{project.title}</p>
        <p className="mt-2 text-sm text-primary">
          {t('projectBudget', {
            min: project.budgetMin,
            max: project.budgetMax,
            currency: project.currency,
          })}
        </p>

        <div className="mt-4 flex flex-wrap gap-1">
          {project.skills.map((s) => (
            <span key={s.slug} className="rounded bg-slate-100 px-2 py-0.5 text-xs">
              {s.name}
            </span>
          ))}
        </div>

        <label className="mt-6 block text-sm font-medium">
          {t('coverLetterLabel')}
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={5}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            placeholder={t('coverLetterPlaceholder')}
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          {t('proposedPrice', { currency: project.currency })}
          <input
            type="number"
            min={1}
            value={proposedPrice}
            onChange={(e) => setProposedPrice(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          {t('deliveryDaysLabel')}
          <input
            type="number"
            min={1}
            max={365}
            value={estimatedDurationDays}
            onChange={(e) => setEstimatedDurationDays(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          />
        </label>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border px-4 py-2 text-sm"
          >
            {tCommon('cancel')}
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSubmitting ? t('submitting') : t('submitProposal')}
          </button>
        </div>
      </form>
    </div>
  );
}
