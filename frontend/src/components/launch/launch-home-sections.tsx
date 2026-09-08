'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { useLaunchPublicProgram } from '@/hooks/use-launch';
import { foundingCountLabel, LAUNCH_DEFAULTS } from '@/lib/launch';
import { Reveal } from '@/components/ui/motion';

export function LaunchHomeSections() {
  const t = useTranslations('launch');
  const { program } = useLaunchPublicProgram();

  const enabled = program?.enabled ?? true;
  if (!enabled) return null;

  const welcomePoints = program?.welcomePoints ?? LAUNCH_DEFAULTS.welcomePoints;
  const profileReward =
    program?.profileCompletionReward ?? LAUNCH_DEFAULTS.profileCompletionReward;
  const commission =
    program?.freelancerCommissionPercent ?? LAUNCH_DEFAULTS.freelancerCommissionPercent;
  const founding = foundingCountLabel(program);
  const foundingLimit =
    founding?.limit ?? program?.foundingFreelancerLimit ?? LAUNCH_DEFAULTS.foundingFreelancerLimit;
  const hasRealCount = Boolean(program && typeof program.foundingPermanentCount === 'number');

  return (
    <>
      <section className="page-gutter page-section">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-sm font-bold text-ember">{t('offerEyebrow')}</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-ink sm:text-3xl md:text-4xl">
              {t('offerTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
              {t('offerSubtitle')}
            </p>
          </Reveal>

          <div className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-3 sm:gap-4">
            {[
              t('welcomePoints', { count: welcomePoints }),
              t('profileBonus', { count: profileReward }),
              t('zeroCommission', { percent: commission }),
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-line bg-surface px-4 py-5 text-sm font-semibold text-ink shadow-sm"
              >
                <span className="me-2 text-ember" aria-hidden>
                  ✓
                </span>
                {item}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap">
            <Link
              href="/register?role=FREELANCER"
              className="inline-flex items-center justify-center rounded-full bg-ember px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_-8px_rgba(234,88,12,0.55)] transition hover:bg-ember-deep"
            >
              {t('ctaJoinFreelancer')}
            </Link>
            <Link
              href="/register?role=CLIENT"
              className="inline-flex items-center justify-center rounded-full border border-line bg-cream-deep/70 px-6 py-3 text-sm font-semibold text-ink transition hover:border-ember/40"
            >
              {t('ctaPostProject')}
            </Link>
          </div>

          <p className="mt-4 text-xs font-semibold text-ember sm:text-sm">
            {t('zeroCommission', { percent: commission })}
          </p>
          <p className="mt-2 text-xs text-ink-soft sm:text-sm">{t('paymentDisclaimer')}</p>
        </div>
      </section>

      <section className="page-gutter page-section bg-cream-deep/55">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-sm font-bold text-palm-deep">{t('foundingEyebrow')}</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-ink sm:text-3xl">
              {t('foundingTitle')}
            </h2>
            {hasRealCount && founding ? (
              <p className="mt-3 text-sm text-ink-soft sm:text-base">
                {t('foundingCount', {
                  count: founding.count.toLocaleString(),
                  limit: founding.limit.toLocaleString(),
                })}
                {typeof program?.slotsRemaining === 'number' ? (
                  <>
                    {' · '}
                    {t('foundingSlotsRemaining', {
                      count: program.slotsRemaining.toLocaleString(),
                    })}
                  </>
                ) : null}
              </p>
            ) : (
              <p className="mt-3 text-sm text-ink-soft sm:text-base">
                {t('foundingSubtitleFallback', {
                  limit: foundingLimit.toLocaleString(),
                })}
              </p>
            )}
          </Reveal>

          <div className="mt-6">
            <Link
              href="/register?role=FREELANCER"
              className="inline-flex items-center justify-center rounded-full border border-palm/30 bg-palm/10 px-6 py-3 text-sm font-semibold text-palm-deep transition hover:bg-palm/15"
            >
              {t('foundingCta')}
            </Link>
          </div>
        </div>
      </section>

      <section className="page-gutter page-section">
        <div className="mx-auto max-w-5xl">
          <Reveal>
            <p className="text-sm font-bold text-ember">{t('clientEyebrow')}</p>
            <h2 className="font-display mt-2 text-2xl font-bold text-ink sm:text-3xl">
              {t('clientOfferTitle')}
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
              {t('clientOfferSubtitle')}
            </p>
          </Reveal>
          <div className="mt-6">
            <Link
              href="/dashboard/projects/new"
              className="inline-flex items-center justify-center rounded-full bg-ink px-6 py-3 text-sm font-semibold text-cream transition hover:bg-ink/90"
            >
              {t('ctaPostProject')}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
