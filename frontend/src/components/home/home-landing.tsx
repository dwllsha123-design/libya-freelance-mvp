'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest, type PublicProfile } from '@/lib/api';
import { FreelancerCarousel } from '@/components/home/freelancer-carousel';
import { PlatformStatsBar } from '@/components/home/platform-stats-bar';
import { ProjectBriefCard } from '@/components/home/project-brief-card';
import {
  LIBYAN_CITIES_HIGHLIGHT_AR,
  PLATFORM_CURRENCY_CODE,
  PLATFORM_FLAG,
  PLATFORM_HERO_HEADLINE_AR,
  PLATFORM_HERO_SUBHEADLINE_AR,
  PLATFORM_NAME_AR,
  PLATFORM_TAGLINE_AR,
} from '@/lib/branding';
import { formatBudgetRange } from '@/lib/currency';
import type { PaginatedProjects, ProjectListItem } from '@/lib/schemas/project';

interface FreelancerListResponse {
  data: PublicProfile[];
  meta: { total: number };
}

const WHY_LIBYA = [
  {
    title: 'مصمّم للسوق الليبي',
    body: 'منصة عربية بالكامل، مبنية لتلبية احتياجات الشركات والمستقلين داخل ليبيا — لا حلول مستوردة.',
  },
  {
    title: `الميزانيات بـ${PLATFORM_CURRENCY_CODE}`,
    body: 'كل الأسعار والعروض بالدينار الليبي. لا التباس في العملة، لا مفاجآت في التحويل.',
  },
  {
    title: 'تغطية المدن الليبية',
    body: `مستقلون ومشاريع في ${LIBYAN_CITIES_HIGHLIGHT_AR} — حضورياً أو عن بُعد.`,
  },
  {
    title: 'ثقة محلية',
    body: 'ملفات موثّقة، تقييمات حقيقية، ومشاريع مكتملة — لتختار بثقة من مجتمعك.',
  },
] as const;

export function HomeLanding() {
  const [freelancers, setFreelancers] = useState<PublicProfile[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [freelancerTotal, setFreelancerTotal] = useState(0);
  const [projectTotal, setProjectTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [freelancerRes, projectRes] = await Promise.all([
          apiRequest<FreelancerListResponse>('/freelancers?limit=12'),
          apiRequest<PaginatedProjects>('/projects?limit=6'),
        ]);

        if (!cancelled) {
          setFreelancers(freelancerRes.data);
          setProjects(projectRes.items);
          setFreelancerTotal(freelancerRes.meta.total);
          setProjectTotal(projectRes.total);
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

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-surface-container-low to-background px-4 pb-16 pt-10 sm:pt-14">
        <div className="pointer-events-none absolute -start-24 top-0 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-5xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            {PLATFORM_FLAG} {PLATFORM_TAGLINE_AR}
          </span>
          <h1 className="mt-6 text-4xl font-bold leading-tight text-on-surface sm:text-5xl">
            {PLATFORM_HERO_HEADLINE_AR}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-on-surface-variant">
            {PLATFORM_HERO_SUBHEADLINE_AR}
          </p>
          <p className="mx-auto mt-3 text-sm text-on-surface-variant">
            {LIBYAN_CITIES_HIGHLIGHT_AR}
          </p>
        </div>

        <div className="relative mx-auto mt-10 max-w-3xl">
          <ProjectBriefCard projectCount={projectTotal} variant="hero" />
        </div>
      </section>

      <PlatformStatsBar />

      <section className="px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-on-surface">لماذا {PLATFORM_NAME_AR}؟</h2>
            <p className="mt-2 text-on-surface-variant">
              منصة عمل حر ليبية — صُمّمت لربط المواهب المحلية بأصحاب المشاريع في كل المدن
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_LIBYA.map((item) => (
              <div
                key={item.title}
                className="rounded-xl border border-outline-variant/40 bg-surface p-5 shadow-sm"
              >
                <h3 className="font-semibold text-on-surface">{item.title}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{item.body}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center">
            <Link href="/about" className="font-semibold text-primary hover:underline">
              اعرف المزيد عنا ←
            </Link>
          </p>
        </div>
      </section>

      {freelancers.length > 0 ? (
        <section className="bg-surface-container-low px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">
                  {freelancerTotal || freelancers.length} مستقل ليبي جاهز للتوظيف
                </h2>
                <p className="mt-1 text-on-surface-variant">
                  مطوّرون، مصممون، مسوّقون — من مدن ليبيا المختلفة
                </p>
              </div>
              <Link href="/freelancers" className="font-semibold text-primary hover:underline">
                تصفّح جميع المواهب ←
              </Link>
            </div>
            <div className="mt-8">
              <FreelancerCarousel freelancers={freelancers} />
            </div>
          </div>
        </section>
      ) : null}

      {projects.length > 0 ? (
        <section className="px-4 py-14">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-on-surface">فرص عمل حر في ليبيا</h2>
                <p className="mt-1 text-on-surface-variant">
                  أحدث المشاريع المنشورة — الميزانيات بالدينار الليبي ({PLATFORM_CURRENCY_CODE})
                </p>
              </div>
              <Link href="/projects" className="font-semibold text-primary hover:underline">
                تصفّح جميع المشاريع ←
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
          <h2 className="text-2xl font-bold text-on-surface">مشروع جديد في ليبيا؟</h2>
          <p className="mt-2 text-on-surface-variant">
            انشر إعلانك بالدينار الليبي — صِف ما تحتاجه في طرابلس أو أي مدينة، وسنُحضّر لك
            مسودة جاهزة
          </p>
        </div>
        <div className="relative mx-auto mt-8 max-w-3xl">
          <ProjectBriefCard projectCount={projectTotal} variant="footer" />
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-16">
        <h2 className="text-center text-2xl font-bold text-on-surface">
          كيف يعمل {PLATFORM_NAME_AR}؟
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-on-surface-variant">
          ثلاث خطوات بسيطة — من التصفح في ليبيا إلى إنجاز المشروع بالدينار الليبي
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            ['تصفّح بحرية', 'استكشف المشاريع والمستقلين في مدينتك — بدون حساب'],
            ['انشر أو قدّم عرضاً', 'سجّل عند الحاجة وحدّد ميزانيتك بالدينار الليبي'],
            ['أنجز وقيّم', 'تواصل محلياً، أكمل المشروع، وساهم في بناء مجتمع موثوق'],
          ].map(([title, body], i) => (
            <div
              key={title}
              className="rounded-xl border border-outline-variant/40 bg-surface p-6 shadow-sm"
            >
              <span className="text-sm font-bold text-primary">{i + 1}</span>
              <h3 className="mt-2 font-semibold text-on-surface">{title}</h3>
              <p className="mt-2 text-sm text-on-surface-variant">{body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/how-it-works" className="text-primary hover:underline">
            دليل مفصّل ←
          </Link>
          <Link href="/escrow" className="text-primary hover:underline">
            نظام الضمان ←
          </Link>
        </div>
      </section>

      <section className="sr-only" aria-label="حقائق أساسية">
        <h2>حقائق أساسية عن {PLATFORM_NAME_AR}</h2>
        <ul>
          <li>سوق عمل حر ليبي لتوظيف المستقلين المحليين في كل المدن</li>
          <li>ميزانيات وعروض بالدينار الليبي د.ل</li>
          <li>ملفات مستقلين ليبيين مع مهارات ومعرض أعمال وتقييمات</li>
          <li>تغطية طرابلس وبنغازي ومصراتة والمدن الليبية الأخرى</li>
        </ul>
      </section>
    </>
  );
}
