'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ApiError, apiRequest } from '@/lib/api';
import {
  getLocalizedCategoryName,
  getLocalizedCityName,
} from '@/lib/locale-content';
import type { AppLocale } from '@/i18n/routing';
import type { ProjectListItem } from '@/lib/schemas/project';

const COVER_MAX = 5000;
const COVER_MIN = 50;
const DEFAULT_SUBMIT_COST = 10;

interface BoostBoardEntry {
  rank: number;
  boostPoints: number;
  createdAtRelative: string;
  initials: string;
}

const MAX_BOOST = 500;

export interface ProposalSubmitValues {
  coverLetter: string;
  proposedPrice: number;
  estimatedDurationDays: number;
  boostPoints: number;
}

interface ProposalFormModalProps {
  project: ProjectListItem;
  open: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: ProposalSubmitValues) => Promise<void>;
  submitCost?: number;
  balance?: number | null;
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-cream p-5 shadow-sm sm:p-6">
      <h3 className="mb-4 border-b border-line/70 pb-3 font-display text-base font-bold text-ink">
        {title}
      </h3>
      {children}
    </section>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line/40 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-sm text-ink-soft">{label}</dt>
      <dd className="text-sm font-medium text-ink">{value}</dd>
    </div>
  );
}

export function ProposalFormModal(props: ProposalFormModalProps) {
  if (!props.open) return null;
  return <ProposalFormModalBody key={props.project.id} {...props} />;
}

function ProposalFormModalBody({
  project,
  open,
  isSubmitting,
  onClose,
  onSubmit,
  submitCost = DEFAULT_SUBMIT_COST,
  balance = null,
}: ProposalFormModalProps) {
  const t = useTranslations('proposals');
  const tProjects = useTranslations('projects');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [coverLetter, setCoverLetter] = useState('');
  const [proposedPrice, setProposedPrice] = useState(String(project.budgetMin));
  const [estimatedDurationDays, setEstimatedDurationDays] = useState('14');
  const [boostDraft, setBoostDraft] = useState(0);
  const [boostPoints, setBoostPoints] = useState(0);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [boostBoard, setBoostBoard] = useState<BoostBoardEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const EXPERIENCE_LABELS: Record<string, string> = useMemo(
    () => ({
      ENTRY: tProjects('experienceEntry'),
      INTERMEDIATE: tProjects('experienceIntermediate'),
      EXPERT: tProjects('experienceExpert'),
    }),
    [tProjects],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiRequest<{ items?: BoostBoardEntry[] }>(
          `/projects/${project.id}/proposals/boost-board`,
        );
        if (!cancelled) {
          setBoostBoard(Array.isArray(data?.items) ? data.items : []);
        }
      } catch {
        if (!cancelled) setBoostBoard([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [project.id]);

  if (!open) return null;

  const remainingAfterSubmit =
    balance == null ? null : balance - submitCost - boostPoints;
  const totalCost = submitCost + boostPoints;
  const insufficient =
    balance != null && balance < totalCost;

  const workModeLabel =
    project.workMode === 'REMOTE'
      ? tProjects('workModeRemote')
      : project.workMode === 'HYBRID'
        ? tProjects('workModeHybrid')
        : project.city
          ? getLocalizedCityName(project.city, locale)
          : tProjects('workModeOnSite');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const price = Number(proposedPrice);
    const days = Number(estimatedDurationDays);

    if (coverLetter.trim().length < COVER_MIN) {
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
    if (insufficient) {
      setError(t('settingsInsufficient'));
      return;
    }

    try {
      await onSubmit({
        coverLetter: coverLetter.trim(),
        proposedPrice: price,
        estimatedDurationDays: days,
        boostPoints,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('submitFailed'));
    }
  }

  function onFilesPicked(list: FileList | null) {
    if (!list?.length) return;
    const next = [...attachments, ...Array.from(list)].slice(0, 5);
    setAttachments(next);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        className="absolute inset-0 bg-ink/50"
        aria-label={tCommon('closeDialog')}
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-submit-title"
        className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col bg-cream-deep/80 shadow-2xl sm:my-4 sm:h-[min(96vh,920px)] sm:rounded-3xl"
      >
        <header className="shrink-0 border-b border-line bg-cream px-4 py-4 sm:rounded-t-3xl sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2
                id="proposal-submit-title"
                className="font-display text-xl font-bold text-ink"
              >
                {t('submit')}
              </h2>
              <p className="mt-1 line-clamp-2 text-sm text-ink-soft">
                {project.title}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-2 py-1 text-sm text-ink-soft hover:bg-cream-deep hover:text-ink"
            >
              {tCommon('close')}
            </button>
          </div>
        </header>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            {/* 1. إعدادات التقديم */}
            <SectionCard title={t('sectionSettings')}>
              <p className="text-sm text-ink">
                {t('settingsRequires', { cost: submitCost })}
              </p>
              {balance == null ? (
                <p className="mt-2 text-sm text-amber-700">
                  {t('settingsBalanceUnknown')}
                </p>
              ) : (
                <p
                  className={`mt-2 text-sm ${
                    remainingAfterSubmit != null && remainingAfterSubmit < 0
                      ? 'font-medium text-red-600'
                      : 'text-ink-soft'
                  }`}
                >
                  {t('settingsRemaining', {
                    remaining: remainingAfterSubmit ?? 0,
                  })}
                  {insufficient ? (
                    <span className="mt-1 block text-red-600">
                      {t('settingsInsufficient')}
                    </span>
                  ) : null}
                </p>
              )}
              <p className="mt-3 text-xs text-ink-soft">
                {t('pointsCost', { cost: submitCost })}
                {balance != null
                  ? ` · ${balance.toLocaleString(numberLocale)} ${t('pointsUnit')}`
                  : null}
              </p>
            </SectionCard>

            {/* 2. تفاصيل العرض */}
            <SectionCard title={t('sectionOfferDetails')}>
              <dl>
                <MetaRow label={t('detailTitle')} value={project.title} />
                <MetaRow
                  label={t('detailCategory')}
                  value={getLocalizedCategoryName(project.category, locale)}
                />
                <MetaRow
                  label={t('detailBudget')}
                  value={t('detailBudgetValue', {
                    min: project.budgetMin.toLocaleString(numberLocale),
                    max: project.budgetMax.toLocaleString(numberLocale),
                  })}
                />
                <MetaRow
                  label={t('detailExperience')}
                  value={EXPERIENCE_LABELS[project.experienceLevel] ?? '—'}
                />
                <MetaRow label={t('detailWorkMode')} value={workModeLabel} />
                {project.deadline ? (
                  <MetaRow
                    label={t('detailDeadline')}
                    value={new Date(project.deadline).toLocaleDateString(
                      numberLocale,
                    )}
                  />
                ) : null}
              </dl>
              {project.skills.length > 0 ? (
                <div className="mt-3">
                  <p className="mb-2 text-sm text-ink-soft">
                    {t('detailSkills')}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {project.skills.map((s) => (
                      <span
                        key={s.slug}
                        className="rounded-full bg-cream-deep/50 px-2.5 py-0.5 text-xs text-ink"
                      >
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </SectionCard>

            {/* 3. التسليم والسعر */}
            <SectionCard title={t('sectionDeliveryPrice')}>
              <label className="block text-sm font-medium text-ink">
                {t('estimatedDaysLabel')}
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={estimatedDurationDays}
                  onChange={(e) => setEstimatedDurationDays(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-cream px-3 py-2.5 text-sm outline-none focus:border-ember focus:ring-1 focus:ring-ember"
                />
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  {t('estimatedDaysHint')}
                </span>
              </label>

              <label className="mt-4 block text-sm font-medium text-ink">
                {t('proposedPriceLabel')}
                <div className="relative mt-1.5">
                  <input
                    type="number"
                    min={1}
                    step="1"
                    value={proposedPrice}
                    onChange={(e) => setProposedPrice(e.target.value)}
                    className="w-full rounded-lg border border-line bg-cream px-3 py-2.5 pe-14 text-sm outline-none focus:border-ember focus:ring-1 focus:ring-ember"
                  />
                  <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-xs font-semibold text-ink-soft">
                    د.ل
                  </span>
                </div>
                <span className="mt-1 block text-xs font-normal text-ink-soft">
                  {t('proposedPriceHint')}
                </span>
              </label>
            </SectionCard>

            {/* 4. تفاصيل إضافية */}
            <SectionCard title={t('sectionExtraDetails')}>
              <label className="block text-sm font-medium text-ink">
                {t('coverLetterLabel')}
                <textarea
                  value={coverLetter}
                  onChange={(e) =>
                    setCoverLetter(e.target.value.slice(0, COVER_MAX))
                  }
                  rows={7}
                  maxLength={COVER_MAX}
                  className="mt-1.5 w-full resize-y rounded-lg border border-line bg-cream px-3 py-2.5 text-sm leading-relaxed outline-none focus:border-ember focus:ring-1 focus:ring-ember"
                  placeholder={t('coverLetterPlaceholder')}
                />
              </label>
              <p className="mt-1.5 text-end text-xs text-ink-soft">
                {t('coverLetterCounter', { count: coverLetter.length })}
              </p>
            </SectionCard>

            {/* 5. المرفقات */}
            <SectionCard title={t('sectionAttachments')}>
              <p className="text-sm text-ink-soft">{t('attachmentsHelp')}</p>
              <p className="mt-1 text-xs text-ink-soft">{t('attachmentsHint')}</p>

              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="sr-only"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-cream-deep/50 px-4 py-2.5 text-sm font-medium text-ink hover:bg-cream-deep"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 text-ember"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M15.621 4.379a3 3 0 0 0-4.242 0l-7 7a3 3 0 0 0 4.241 4.243h.001l.497-.5a.75.75 0 0 1 1.064 1.057l-.498.501-.002.002a4.5 4.5 0 0 1-6.364-6.364l7-7a4.5 4.5 0 0 1 6.368 6.36l-3.455 3.553A2.625 2.625 0 1 1 9.52 9.52l3.45-3.451a.75.75 0 1 1 1.061 1.06l-3.45 3.451a1.125 1.125 0 0 0 1.591 1.59l3.455-3.553a3 3 0 0 0 0-4.242Z"
                    clipRule="evenodd"
                  />
                </svg>
                {t('attachmentsButton')}
              </button>

              <div className="mt-3">
                {attachments.length === 0 ? (
                  <p className="text-xs text-ink-soft">{t('attachmentsNone')}</p>
                ) : (
                  <>
                    <p className="text-xs font-medium text-ink-soft">
                      {t('attachmentsSelected')}
                    </p>
                    <ul className="mt-1.5 space-y-1">
                      {attachments.map((file, idx) => (
                        <li
                          key={`${file.name}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-md bg-cream-deep/50 px-3 py-1.5 text-xs"
                        >
                          <span className="truncate">{file.name}</span>
                          <button
                            type="button"
                            className="shrink-0 text-red-600 hover:underline"
                            onClick={() =>
                              setAttachments((prev) =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            {t('attachmentsRemove')}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </SectionCard>

            {/* 6. تعزيز العرض */}
            <SectionCard title={t('sectionBoost')}>
              <p className="text-sm text-ink-soft">{t('boostIntro')}</p>

              <div className="mt-4 overflow-hidden rounded-lg border border-line">
                <div className="bg-cream-deep/50 px-3 py-2 text-xs font-semibold text-ink-soft">
                  {t('boostBoardTitle')}
                </div>
                {boostBoard.length === 0 ? (
                  <p className="px-3 py-4 text-sm text-ink-soft">
                    {t('boostBoardEmpty')}
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line/60 text-start text-xs text-ink-soft">
                        <th className="px-3 py-2 font-medium">{t('boostRank')}</th>
                        <th className="px-3 py-2 font-medium">{t('boostBid')}</th>
                        <th className="px-3 py-2 font-medium">{t('boostWhen')}</th>
                        <th className="px-3 py-2 font-medium">
                          {t('boostFreelancer')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {boostBoard.map((row) => (
                        <tr
                          key={`${row.rank}-${row.initials}-${row.boostPoints}`}
                          className="border-b border-line/40 last:border-0"
                        >
                          <td className="px-3 py-2">
                            {t('boostPlace', { rank: row.rank })}
                          </td>
                          <td className="px-3 py-2 font-medium text-ember">
                            {t('boostPointsLabel', { count: row.boostPoints })}
                          </td>
                          <td className="px-3 py-2 text-ink-soft">
                            {row.createdAtRelative}
                          </td>
                          <td className="px-3 py-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cream-deep text-xs font-bold text-ink">
                              {row.initials}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="text-sm font-medium">{t('boostYourBid')}</span>
                <div className="inline-flex items-center overflow-hidden rounded-lg border border-line bg-cream">
                  <button
                    type="button"
                    className="px-3 py-2 text-lg leading-none text-ink-soft hover:bg-cream-deep"
                    onClick={() =>
                      setBoostDraft((v) => Math.max(0, v - 1))
                    }
                    aria-label="-"
                  >
                    −
                  </button>
                  <span className="min-w-[3rem] border-x border-line px-3 py-2 text-center text-sm font-semibold tabular-nums">
                    {boostDraft}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-2 text-lg leading-none text-ink-soft hover:bg-cream-deep"
                    onClick={() =>
                      setBoostDraft((v) => Math.min(MAX_BOOST, v + 1))
                    }
                    aria-label="+"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBoostPoints(Math.min(MAX_BOOST, Math.max(0, boostDraft)))
                  }
                  className="rounded-lg border border-ember/30 bg-ember/5 px-3 py-2 text-sm font-semibold text-ember hover:bg-ember/10"
                >
                  {t('boostSetBid')}
                </button>
              </div>

              <dl className="mt-4 space-y-2 rounded-lg bg-cream-deep/50 p-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{t('boostSummaryBoost')}</dt>
                  <dd className="font-medium">
                    {t('boostPointsLabel', { count: boostPoints })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-ink-soft">{t('boostSummarySubmit')}</dt>
                  <dd className="font-medium">
                    {t('boostPointsLabel', { count: submitCost })}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-line pt-2 font-bold text-ink">
                  <dt>{t('boostSummaryTotal')}</dt>
                  <dd className="text-ember">
                    {t('boostPointsLabel', { count: totalCost })}
                  </dd>
                </div>
              </dl>
            </SectionCard>

            {error ? (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          {/* Sticky footer */}
          <div className="shrink-0 border-t border-line bg-cream px-4 py-3 sm:rounded-b-2xl sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-3 py-2 text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
              >
                {tCommon('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || insufficient}
                className="rounded-lg bg-ember px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-ember-deep disabled:opacity-50"
              >
                {isSubmitting
                  ? t('submitting')
                  : t('submitForPoints', { total: totalCost })}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
