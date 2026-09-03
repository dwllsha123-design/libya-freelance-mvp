'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { apiRequest, type PublicProfile } from '@/lib/api';
import { FreelancerCarousel } from '@/components/home/freelancer-carousel';
import { HomeAudienceTabs } from '@/components/home/home-audience-tabs';
import { HomeFaq } from '@/components/home/home-faq';
import { HomeMobileAppsSection } from '@/components/home/home-mobile-apps-section';
import { PlatformStatsBar } from '@/components/home/platform-stats-bar';
import { ProjectBriefCard } from '@/components/home/project-brief-card';
import { getHomeCategories, getHomeCities, getHomeContent } from '@/lib/home-content-i18n';
import { DESIGN_HERO_SMOKE_PATH, DESIGN_GLOW_PATH, DESIGN_MARBLE_PATH } from '@/lib/branding';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import { formatBudgetRange } from '@/lib/currency';
import { Reveal, Pill } from '@/components/ui/motion';
import { PrayerTimes } from '@/components/home/prayer-times';
import type { AppLocale } from '@/i18n/routing';
import type { PaginatedProjects, ProjectListItem } from '@/lib/schemas/project';

const SKILL_MARQUEE = [
  'React',
  'تصميم واجهات',
  'Motion Graphics',
  'كتابة محتوى',
  'Node.js',
  'SEO',
  'Branding',
  'Figma',
  'ترجمة',
  'Flutter',
  'تسويق رقمي',
  'Illustrator',
];

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { total: number };
}

interface PublicBanner {
  id: string;
  text: string;
  link: string | null;
}

export function HomeLanding() {
  const t = useTranslations('home');
  const tBrand = useTranslations('brand');
  const tCommon = useTranslations('common');
  const locale = useLocale() as AppLocale;
  const content = getHomeContent(locale);
  const homeCities = getHomeCities();
  const homeCategories = getHomeCategories();
  const numberLocale = locale === 'ar' ? 'ar-LY' : 'en-LY';

  const [freelancers, setFreelancers] = useState<PublicProfile[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [freelancerTotal, setFreelancerTotal] = useState(0);
  const [projectTotal, setProjectTotal] = useState(0);
  const [banners, setBanners] = useState<PublicBanner[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [freelancerRes, projectRes, bannersRes] = await Promise.all([
          apiRequest<FreelancerListResponse>('/freelancers?limit=12'),
          apiRequest<PaginatedProjects>('/projects?limit=6'),
          apiRequest<{ items: PublicBanner[] }>('/platform/banners').catch(() => ({
            items: [] as PublicBanner[],
          })),
        ]);

        if (!cancelled) {
          setFreelancers(freelancerRes.data);
          setProjects(projectRes.items);
          setFreelancerTotal(freelancerRes.meta.total);
          setProjectTotal(projectRes.total);
          setBanners(bannersRes.items ?? []);
        }
      } catch {
        /* graceful degrade */
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const freelancerCountLabel =
    freelancerTotal > 0
      ? t('freelancerCount', { count: freelancerTotal.toLocaleString(numberLocale) })
      : t('freelancerReady');

  const topBanner = banners[0];

  return (
    <>
      {topBanner ? (
        <div className="page-gutter bg-ink py-2.5 text-center text-xs text-cream sm:text-sm">
          {topBanner.link ? (
            <a href={topBanner.link} className="underline-offset-2 hover:underline">
              {topBanner.text}
            </a>
          ) : (
            <span>{topBanner.text}</span>
          )}
        </div>
      ) : null}
      <section className="page-gutter relative overflow-hidden pb-0 pt-8 sm:pt-14 md:pt-20">
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-70 animate-floaty"
          style={{
            backgroundImage: `url(${DESIGN_HERO_SMOKE_PATH})`,
            maskImage: 'linear-gradient(to bottom, black 20%, transparent 92%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black 20%, transparent 92%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-cream/25 to-cream"
          aria-hidden
        />
        <div className="pointer-events-none absolute -start-16 top-0 size-64 rounded-full bg-ember/35 blur-3xl animate-floaty sm:-start-20 sm:size-[26rem]" />
        <div
          className="pointer-events-none absolute -end-8 top-16 size-56 rounded-full bg-palm/25 blur-3xl animate-floaty sm:-end-10 sm:top-24 sm:size-96"
          style={{ animationDelay: '2s' }}
        />
        <div className="relative z-10 mx-auto max-w-6xl pb-6 text-center md:pb-10 md:text-start">
          <Reveal>
            <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-ember/30 bg-ember/10 px-3 py-1.5 text-xs font-semibold text-ember-deep sm:px-4 sm:text-sm">
              <span className="hero-badge-star grid size-5 place-items-center rounded-full bg-ember text-[10px] text-white">
                ★
              </span>
              {tBrand('platformFirst')}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1
              className="hero-headline hero-title font-display mt-6 font-bold leading-[1.08] text-royal sm:mt-8 md:mt-10"
              style={{
                textShadow:
                  '0 2px 22px rgba(243, 236, 220, 0.9), 0 1px 0 rgba(243, 236, 220, 0.9)',
              }}
            >
              {tBrand('heroHeadline')}
              <br />
              <span className="text-ink">{tBrand('heroHeadlineAccent')}</span>
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p
              className="hero-lede mx-auto mt-5 max-w-xl font-semibold leading-relaxed text-ink md:mx-0 md:mt-6"
              style={{ textShadow: '0 1px 12px rgba(243, 236, 220, 0.8)' }}
            >
              <span className="text-ember">{tBrand('nameStyled')}</span>{' '}
              {tBrand('heroSubheadline')}
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-7 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center md:justify-start">
              <Link
                href="/projects"
                className="group inline-flex items-center justify-center rounded-full bg-ember px-6 py-3.5 text-sm font-semibold text-white shadow-[0_10px_28px_-8px_rgba(234,88,12,0.55)] transition-all hover:-translate-y-0.5 hover:bg-ember-deep sm:px-7"
              >
                {tBrand('browseOffers')}
                <span className="ms-2 inline-block transition-transform group-hover:-translate-x-0.5 rtl:group-hover:translate-x-0.5">
                  ←
                </span>
              </Link>
            </div>
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto mt-10 max-w-6xl sm:mt-12">
          <Reveal delay={280}>
            <PlatformStatsBar variant="heroCards" />
          </Reveal>
        </div>

        <div className="relative z-10 mx-auto mt-8 max-w-3xl sm:mt-10">
          <Reveal delay={320}>
            <ProjectBriefCard projectCount={projectTotal} variant="hero" />
          </Reveal>
        </div>

        <div className="relative z-10 mt-8">
          <Reveal delay={360}>
            <PrayerTimes />
          </Reveal>
        </div>

        <div className="relative mt-10 flex overflow-hidden border-y border-line/70 bg-cream-deep/50 py-4 sm:mt-12">
          <div className="marquee-track flex shrink-0 items-center gap-3 pe-3">
            {[...SKILL_MARQUEE, ...SKILL_MARQUEE].map((m, i) => (
              <span
                key={`${m}-${i}`}
                className="whitespace-nowrap rounded-full border border-line bg-cream px-4 py-1.5 text-sm text-ink-soft"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="page-gutter page-section">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl md:text-4xl">
            {content.painPoints.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-ink-soft sm:text-base">
            {content.painPoints.subtitle}
          </p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 sm:gap-6 md:grid-cols-2">
          {[content.painPoints.client, content.painPoints.freelancer].map((side) => (
            <div
              key={side.label}
              className="rounded-2xl border border-line bg-surface p-5 shadow-[0_16px_40px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 sm:p-6"
            >
              <p className="text-sm font-bold text-ember">{side.label}</p>
              <ul className="mt-4 space-y-3">
                {side.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-ink-soft"
                  >
                    <span className="mt-0.5 text-error" aria-hidden>
                      ✕
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="page-gutter page-section bg-cream-deep/60">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {content.features.map((feature, i) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5"
              >
                <span
                  className={`grid size-10 place-items-center rounded-xl text-lg ${
                    i % 2 === 0 ? 'bg-ember/10 text-ember' : 'bg-palm/10 text-palm-deep'
                  }`}
                  aria-hidden
                >
                  {feature.icon}
                </span>
                <h3 className="mt-3 font-display font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm text-ink-soft">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="page-gutter page-section">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl md:text-4xl">
            {content.steps.title}
          </h2>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{content.steps.subtitle}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-5xl gap-4 sm:mt-10 sm:gap-6 md:grid-cols-3">
          {content.steps.items.map((step) => (
            <div
              key={step.step}
              className="flex flex-col rounded-2xl border border-line bg-surface p-5 text-center shadow-sm sm:p-6"
            >
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-ember text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(234,88,12,0.6)] sm:h-14 sm:w-14 sm:text-lg">
                {step.step}
              </span>
              <h3 className="mt-4 font-display font-semibold text-ink">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm text-ink-soft">{step.body}</p>
              <span className="mt-4 inline-flex items-center justify-center gap-1 rounded-full bg-palm/10 px-3 py-1 text-xs font-medium text-palm-deep">
                ✓ {step.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      <HomeAudienceTabs />

      <section className="page-gutter page-section">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{t('trustTitle')}</h2>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{t('trustSubtitle')}</p>
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2 sm:mt-8">
          {content.trustBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {freelancers.length > 0 ? (
        <section className="page-gutter page-section bg-cream-deep/50">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">
                  {freelancerCountLabel}
                </h2>
                <p className="mt-1 text-sm text-ink-soft sm:text-base">
                  {content.freelancersSection.subtitle}
                </p>
              </div>
              <Link
                href="/freelancers"
                className="hidden font-semibold text-ember hover:underline sm:inline"
              >
                {content.freelancersSection.browseAll} ←
              </Link>
            </div>
            <div className="mt-6 sm:mt-8">
              <FreelancerCarousel freelancers={freelancers} />
            </div>
            <p className="mt-4 text-center sm:hidden">
              <Link href="/freelancers" className="font-semibold text-ember hover:underline">
                {content.freelancersSection.browseAll} ←
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <section className="page-gutter page-section">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl md:text-4xl">
              {t('categoriesTitle')}
            </h2>
            <p className="mt-2 text-sm text-ink-soft sm:text-base">{t('categoriesSubtitle')}</p>
          </div>
          <Link
            href="/projects"
            className="hidden shrink-0 text-sm font-semibold text-ember hover:underline md:block"
          >
            {t('categoriesCta')} ←
          </Link>
        </div>
        <div className="mx-auto mt-6 grid max-w-6xl grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
          {homeCategories.map((cat, i) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-1 hover:border-ember/40 hover:shadow-[0_18px_40px_-20px_rgba(29,24,17,0.35)] sm:gap-4 sm:p-5"
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm sm:size-12 sm:text-xl ${
                  i % 2 === 0 ? 'bg-ember/10 text-ember' : 'bg-palm/10 text-palm-deep'
                }`}
              >
                ✦
              </span>
              <span className="min-w-0 flex-1 truncate font-display font-semibold group-hover:text-ember">
                {getLocalizedCategoryName(cat, locale)}
              </span>
              <span className="shrink-0 text-ink-soft transition group-hover:-translate-x-1" aria-hidden>
                ←
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center md:hidden">
          <Link href="/projects" className="font-semibold text-ember hover:underline">
            {t('categoriesCta')} ←
          </Link>
        </p>
      </section>

      <section className="page-gutter page-section bg-cream-deep/40">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl">{t('citiesTitle')}</h2>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{t('citiesSubtitle')}</p>
        </div>
        <div className="mx-auto mt-6 grid max-w-4xl grid-cols-2 gap-3 sm:mt-8 sm:grid-cols-3 md:grid-cols-4">
          {homeCities.map((city) => (
            <Link
              key={city.slug}
              href={`/cities/${city.slug}`}
              className="flex items-center justify-between rounded-2xl border border-line bg-surface px-3 py-3 text-sm font-medium text-ink transition hover:border-ember/40 hover:text-ember sm:px-4"
            >
              <span className="truncate">{getLocalizedCityName(city, locale)}</span>
              <span className="text-ink-soft" aria-hidden>
                ‹
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-center sm:mt-8">
          <Link href="/freelancers" className="font-semibold text-ember hover:underline">
            {t('citiesCta')} ←
          </Link>
        </p>
      </section>

      <HomeFaq />

      <HomeMobileAppsSection />

      <section className="page-gutter page-section border-t border-line/70 bg-surface">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink">{content.resources.title}</h2>
          <p className="mt-2 text-sm text-ink-soft sm:text-base">{content.resources.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            {content.resources.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-line bg-cream-deep/60 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ember hover:text-ember sm:px-5"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {projects.length > 0 ? (
        <section className="page-gutter page-section">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl font-bold text-ink sm:text-3xl md:text-4xl">
                  {content.projectsSection.title}
                </h2>
                <p className="mt-1 text-sm text-ink-soft sm:text-base">
                  {content.projectsSection.subtitle
                    .replace('(د.ل)', `(${tCommon('currencyCode')})`)
                    .replace('(LYD)', `(${tCommon('currencyCode')})`)}
                </p>
              </div>
              <Link
                href="/projects"
                className="hidden font-semibold text-ember hover:underline sm:inline"
              >
                {content.projectsSection.browseAll} ←
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:mt-8 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-sm transition hover:-translate-y-1 hover:border-ember/40 hover:shadow-[0_22px_50px_-24px_rgba(29,24,17,0.4)] sm:p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="min-w-0 flex-1 font-display text-base font-semibold leading-snug text-ink sm:text-lg">
                      {project.title}
                    </h3>
                    <Pill tone="ember">
                      {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency)}
                    </Pill>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
                    {project.description}
                  </p>
                </Link>
              ))}
            </div>
            <p className="mt-4 text-center sm:hidden">
              <Link href="/projects" className="font-semibold text-ember hover:underline">
                {content.projectsSection.browseAll} ←
              </Link>
            </p>
          </div>
        </section>
      ) : null}

      <section className="page-gutter page-section">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-ink px-5 py-12 text-center text-cream shadow-[0_24px_60px_-24px_rgba(15,23,42,0.55)] sm:px-8 sm:py-16 md:rounded-[2rem] md:py-20">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-60"
            style={{ backgroundImage: `url(${DESIGN_GLOW_PATH})` }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink via-ink/80 to-ink/55" />
          <h2 className="relative font-display text-2xl font-bold sm:text-3xl md:text-5xl">
            {content.ctaFooter.title}
          </h2>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-cream/70 sm:mt-4 sm:text-base">
            {content.ctaFooter.subtitle}
          </p>
          <div className="relative mx-auto mt-8 max-w-xl">
            <ProjectBriefCard projectCount={projectTotal} variant="footer" />
          </div>
        </div>
      </section>

      <section id="how-it-works" className="relative scroll-mt-24 overflow-hidden border-y border-line/60 py-16 sm:py-20">
        <div
          className="howto-marble pointer-events-none absolute inset-0 bg-cover bg-center opacity-25"
          style={{
            backgroundImage: `url(${DESIGN_MARBLE_PATH})`,
            maskImage:
              'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent, black 30%, black 70%, transparent)',
          }}
          aria-hidden
        />
        <div className="page-gutter relative mx-auto max-w-5xl">
          <h2 className="text-center font-display text-2xl font-bold text-ink sm:text-3xl">
            {content.howItWorks.title.replace('{brand}', tBrand('name'))}
          </h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-ink-soft sm:text-base">
            {content.howItWorks.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 sm:mt-10 sm:gap-4">
            <Link href="/how-it-works" className="font-semibold text-ember hover:underline">
              {content.howItWorks.detailedGuide} ←
            </Link>
            <Link href="/escrow" className="font-semibold text-ember hover:underline">
              {content.howItWorks.escrow} ←
            </Link>
            <Link href="/about" className="font-semibold text-ember hover:underline">
              {content.howItWorks.about} ←
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
