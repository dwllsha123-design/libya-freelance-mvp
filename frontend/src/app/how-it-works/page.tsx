import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '@/components/marketing/marketing-page';
import {
  LIBYAN_CITIES_HIGHLIGHT_AR,
  PLATFORM_CURRENCY_CODE,
  PLATFORM_NAME_AR,
} from '@/lib/branding';
import { buildPageMetadata } from '@/lib/seo';
import { VERIFICATION_CRITERIA_AR } from '@/lib/freelancer-trust';

export const metadata: Metadata = buildPageMetadata({
  title: 'كيف تعمل المنصة',
  description: `دليل استخدام ${PLATFORM_NAME_AR} في ليبيا — للعملاء والمستقلين: نشر المشاريع، العروض، والتقييم — كل شيء بالدينار الليبي.`,
  path: '/how-it-works',
});

const CLIENT_STEPS = [
  {
    title: 'تصفّح بحرية',
    body: `استكشف المشاريع والمستقلين في ${LIBYAN_CITIES_HIGHLIGHT_AR} — بدون إنشاء حساب. ابحث حسب المدينة أو المهارة أو الميزانية بالدينار الليبي.`,
  },
  {
    title: 'انشر مشروعك',
    body: 'أنشئ حساب عميل عند الحاجة. صِف مشروعك وحدّد ميزانيتك بـد.ل، أو استخدم مساعد الإعلان من الصفحة الرئيسية.',
  },
  {
    title: 'استقبل العروض',
    body: 'يقدّم المستقلون الليبيون عروضاً تتضمن السعر والمدة بالدينار. قارن الخبرة والتقييمات واختر الأنسب لمشروعك.',
  },
  {
    title: 'تواصل وأنجز',
    body: 'تواصل مع المستقل عبر الرسائل داخل المنصة. تابع التقدم حتى إتمام المشروع — محلياً أو عن بُعد.',
  },
  {
    title: 'قيّم التجربة',
    body: 'بعد الإتمام، اترك تقييماً صادقاً. تقييمك يبني مجتمع عمل حر ليبي أكثر شفافية وموثوقية.',
  },
];

const FREELANCER_STEPS = [
  {
    title: 'أنشئ ملفاً ليبياً قوياً',
    body: 'أضف صورتك، نبذة مهنية، مدينتك، مهاراتك، ومعرض أعمالك. الملف الكامل يزيد ظهورك أمام العملاء المحليين.',
  },
  {
    title: 'تصفّح مشاريع ليبيا',
    body: `ابحث عن فرص في مدينتك أو عن بُعد — ${LIBYAN_CITIES_HIGHLIGHT_AR}. فلتر حسب التصنيف والميزانية.`,
  },
  {
    title: 'قدّم عروضاً بالدينار',
    body: `اشرح خبرتك وقدّم سعراً ومدة واقعيين بـ${PLATFORM_CURRENCY_CODE}. العملاء الليبيون يفضّلون الوضوح في العملة.`,
  },
  {
    title: 'نفّذ باحترافية',
    body: 'تواصل مع العميل، سلّم العمل في الوقت المتفق عليه، وابنِ سمعتك في السوق الليبي.',
  },
  {
    title: 'احصل على شارة «موثّق»',
    body: 'أكمل ملفك، أنجز مشروعاً واحداً على الأقل، واحصل على تقييم 4 نجوم فأعلى — شارة تُميّزك بين المستقلين.',
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingPage
      title="كيف تعمل المنصة"
      subtitle={`دليل ${PLATFORM_NAME_AR} — سوق العمل الحر الليبي للعملاء والمستقلين`}
    >
      <p>
        {PLATFORM_NAME_AR} يجمع بين أصحاب المشاريع والمواهب الليبية في مكان واحد. سواء كنت
        في طرابلس أو بنغازي أو تعمل عن بُعد — الخطوات التالية توضّح كيف تستفيد من المنصة
        بالدينار الليبي ({PLATFORM_CURRENCY_CODE}).
      </p>

      <h2>للعملاء — من الفكرة إلى الإنجاز في ليبيا</h2>
      <div className="not-prose space-y-4">
        {CLIENT_STEPS.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-4 rounded-xl border border-outline-variant/40 bg-surface p-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">{step.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>للمستقلين — من الملف إلى مشاريع ليبية</h2>
      <div className="not-prose space-y-4">
        {FREELANCER_STEPS.map((step, index) => (
          <div
            key={step.title}
            className="flex gap-4 rounded-xl border border-outline-variant/40 bg-surface p-5"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-tertiary/10 text-sm font-bold text-tertiary">
              {index + 1}
            </span>
            <div>
              <h3 className="font-semibold text-on-surface">{step.title}</h3>
              <p className="mt-1 text-sm text-on-surface-variant">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <h2>شارة «مستقل موثّق»</h2>
      <p>تُمنح تلقائياً للمستقلين الليبيين الذين يستوفون المعايير التالية:</p>
      <ul className="list-disc space-y-2 ps-6">
        {VERIFICATION_CRITERIA_AR.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      <h2>العملة والمدفوعات</h2>
      <p>
        جميع الميزانيات والعروض بالدينار الليبي ({PLATFORM_CURRENCY_CODE}). عند قبول عرض،
        يُموَّل الضمان تلقائياً ويُحرَّر للمستقل بعد الإتمام — راجع{' '}
        <Link href="/escrow">صفحة نظام الضمان</Link>.
      </p>

      <div className="not-prose mt-8 flex flex-wrap gap-4">
        <Link
          href="/register?role=CLIENT&next=/dashboard/projects/new"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          انشر مشروعاً في ليبيا
        </Link>
        <Link
          href="/register?role=FREELANCER"
          className="rounded-lg border border-secondary px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary/5"
        >
          انضم كمستقل ليبي
        </Link>
      </div>
    </MarketingPage>
  );
}
