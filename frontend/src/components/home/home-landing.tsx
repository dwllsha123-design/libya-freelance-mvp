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
import { PLATFORM_FLAG, HERO_MAP_BG_PATH } from '@/lib/branding';
import { getLocalizedCategoryName, getLocalizedCityName } from '@/lib/locale-content';
import { formatBudgetRange } from '@/lib/currency';
import type { AppLocale } from '@/i18n/routing';
import type { PaginatedProjects, ProjectListItem } from '@/lib/schemas/project';

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
        <div className="bg-on-surface px-4 py-2.5 text-center text-sm text-white">
          {topBanner.link ? (
            <a href={topBanner.link} className="underline-offset-2 hover:underline">
              {topBanner.text}
            </a>
          ) : (
            <span>{topBanner.text}</span>
          )}
        </div>
      ) : null}
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-background px-4 pb-16 pt-10 sm:pt-14">
        <div
          className="pointer-events-none absolute inset-0 bg-[length:min(92%,28rem)] bg-[position:center_42%] bg-no-repeat opacity-[0.14] mix-blend-multiply dark:opacity-[0.42] dark:mix-blend-screen sm:bg-[length:min(78%,34rem)]"
          style={{ backgroundImage: `url(${HERO_MAP_BG_PATH})` }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface-container-low/88 via-background/72 to-background dark:from-surface-container-low/75 dark:via-background/55 dark:to-background"
          aria-hidden
        />
        <div className="pointer-events-none absolute -start-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {PLATFORM_FLAG} {tBrand('tagline')}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
            {tBrand('heroHeadline')}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
            {tBrand('heroSubheadline')}
          </p>
          <p className="mx-auto mt-3 text-sm text-on-surface-variant">
            {tBrand('citiesHighlight')}
          </p>
        </div>

        <div className="relative z-10 mx-auto mt-10 max-w-3xl">
          <ProjectBriefCard projectCount={projectTotal} variant="hero" />
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">
            {content.painPoints.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-on-surface-variant">
            {content.painPoints.subtitle}
          </p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
          {[content.painPoints.client, content.painPoints.freelancer].map((side) => (
            <div
              key={side.label}
              className="rounded-2xl border border-outline-variant/40 bg-surface p-6 shadow-sm"
            >
              <p className="text-sm font-bold text-primary">{side.label}</p>
              <ul className="mt-4 space-y-3">
                {side.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-on-surface-variant"
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

      <section className="bg-surface-container-low px-4 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {content.features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-sm"
              >
                <span className="text-2xl" aria-hidden>
                  {feature.icon}
                </span>
                <h3 className="mt-3 font-semibold text-on-surface">{feature.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">
            {content.steps.title}
          </h2>
          <p className="mt-2 text-on-surface-variant">{content.steps.subtitle}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
          {content.steps.items.map((step) => (
            <div
              key={step.step}
              className="flex flex-col rounded-2xl border border-outline-variant/40 bg-surface p-6 text-center shadow-sm"
            >
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                {step.step}
              </span>
              <h3 className="mt-4 font-semibold text-on-surface">{step.title}</h3>
              <p className="mt-2 flex-1 text-sm text-on-surface-variant">{step.body}</p>
              <span className="mt-4 inline-flex items-center justify-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                ✓ {step.badge}
              </span>
            </div>
          ))}
        </div>
      </section>

      <HomeAudienceTabs />

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-on-surface sm:text-3xl">{t('trustTitle')}</h2>
          <p className="mt-2 text-on-surface-variant">{t('trustSubtitle')}</p>
        </div>
        <div className="mx-auto mt-8 max-w-5xl">
          <PlatformStatsBar />
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl flex-wrap justify-center gap-2">
          {content.trustBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-outline-variant/40 bg-surface px-3 py-1.5 text-xs font-medium text-on-surface-variant"
            >
              {badge}
            </span>
          ))}
        </div>
      </section>

      {freelancers.length > 0 ? (
        <section className="bg-surface-container-low px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">{freelancerCountLabel}</h2>
                <p className="mt-1 text-on-surface-variant">
                  {content.freelancersSection.subtitle}
                </p>
              </div>
              <Link href="/freelancers" className="font-semibold text-primary hover:underline">
                {content.freelancersSection.browseAll} ←
              </Link>
            </div>
            <div className="mt-8">
              <FreelancerCarousel freelancers={freelancers} />
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-on-surface">{t('categoriesTitle')}</h2>
          <p className="mt-2 text-on-surface-variant">{t('categoriesSubtitle')}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {homeCategories.map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="flex items-center justify-between rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-medium text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              <span className="truncate">{getLocalizedCategoryName(cat, locale)}</span>
              <span className="shrink-0 text-on-surface-variant" aria-hidden>
                ‹
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href="/projects" className="font-semibold text-primary hover:underline">
            {t('categoriesCta')} ←
          </Link>
        </p>
      </section>

      <section className="bg-surface-container-low px-4 py-16">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="text-2xl font-bold text-on-surface">{t('citiesTitle')}</h2>
          <p className="mt-2 text-on-surface-variant">{t('citiesSubtitle')}</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4">
          {homeCities.map((city) => (
            <Link
              key={city.slug}
              href={`/cities/${city.slug}`}
              className="flex items-center justify-between rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-sm font-medium text-on-surface transition hover:border-primary/40 hover:text-primary"
            >
              <span>{getLocalizedCityName(city, locale)}</span>
              <span className="text-on-surface-variant" aria-hidden>
                ‹
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 text-center">
          <Link href="/freelancers" className="font-semibold text-primary hover:underline">
            {t('citiesCta')} ←
          </Link>
        </p>
      </section>

      <HomeFaq />

      <HomeMobileAppsSection />

      <section className="border-t border-outline-variant/30 bg-surface px-4 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-on-surface">{content.resources.title}</h2>
          <p className="mt-2 text-on-surface-variant">{content.resources.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {content.resources.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-outline-variant/50 bg-surface-container-low px-5 py-2 text-sm font-semibold text-on-surface hover:border-primary hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {projects.length > 0 ? (
        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">{content.projectsSection.title}</h2>
                <p className="mt-1 text-on-surface-variant">
                  {content.projectsSection.subtitle.replace(
                    '(د.ل)',
                    `(${tCommon('currencyCode')})`,
                  ).replace('(LYD)', `(${tCommon('currencyCode')})`)}
                </p>
              </div>
              <Link href="/projects" className="font-semibold text-primary hover:underline">
                {content.projectsSection.browseAll} ←
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.slug}
                  href={`/projects/${project.slug}`}
                  className="rounded-xl border border-outline-variant/40 bg-surface p-5 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-on-surface">{project.title}</h3>
                    <span className="shrink-0 rounded-lg bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-on-surface-variant">
                    {project.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-gradient-to-b from-primary/5 to-background px-4 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-on-surface">{content.ctaFooter.title}</h2>
          <p className="mt-2 text-on-surface-variant">{content.ctaFooter.subtitle}</p>
        </div>
        <div className="relative mx-auto mt-8 max-w-3xl">
          <ProjectBriefCard projectCount={projectTotal} variant="footer" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-on-surface">
          {content.howItWorks.title.replace('{brand}', tBrand('name'))}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-on-surface-variant">
          {content.howItWorks.subtitle}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/how-it-works" className="text-primary hover:underline">
            {content.howItWorks.detailedGuide} ←
          </Link>
          <Link href="/escrow" className="text-primary hover:underline">
            {content.howItWorks.escrow} ←
          </Link>
          <Link href="/about" className="text-primary hover:underline">
            {content.howItWorks.about} ←
          </Link>
        </div>
      </section>
    </>
  );
}
