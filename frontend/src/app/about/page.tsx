import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '@/components/marketing/marketing-page';
import {
  LIBYAN_CITIES_HIGHLIGHT_AR,
  PLATFORM_COUNTRY_AR,
  PLATFORM_CURRENCY_AR,
  PLATFORM_CURRENCY_CODE,
  PLATFORM_FLAG,
  PLATFORM_MISSION_AR,
  PLATFORM_NAME_AR,
  PLATFORM_TAGLINE_AR,
} from '@/lib/branding';
import { LIBYAN_CITIES } from '@/lib/marketplace-content';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: `من نحن — ${PLATFORM_NAME_AR}`,
  description: `${PLATFORM_NAME_AR} — ${PLATFORM_TAGLINE_AR}. منصة ليبية تربط أصحاب المشاريع بالمواهب المحلية في طرابلس وبنغازي ومصراتة — بالدينار الليبي.`,
  path: '/about',
});

export default function AboutPage() {
  return (
    <MarketingPage title={`من نحن — ${PLATFORM_NAME_AR}`} subtitle={PLATFORM_TAGLINE_AR}>
      <p className="text-lg">
        {PLATFORM_FLAG} {PLATFORM_NAME_AR} منصة عمل حر {PLATFORM_COUNTRY_AR}ية — صُمّمت من
        الصفر لتلبية احتياجات السوق المحلي. نربط الشركات، رواد الأعمال، والأفراد بمستقلين
        ليبيين في البرمجة والتصميم والتسويق والكتابة وغيرها.
      </p>

      <h2>رسالتنا</h2>
      <p>{PLATFORM_MISSION_AR}</p>

      <h2>لماذا منصة ليبية؟</h2>
      <p>
        السوق الليبي له خصوصيته: العملة ({PLATFORM_CURRENCY_AR} — {PLATFORM_CURRENCY_CODE})،
        المدن، اللغة، وطبيعة التعامل. لذلك بنينا {PLATFORM_NAME_AR} ليكون البديل المحلي
        الموثوق — ليس منصة عامة مُكيَّفة، بل سوق عمل حر يفهم ليبيا.
      </p>

      <h2>المدن التي نخدمها</h2>
      <p>
        مستقلون ومشاريع في {LIBYAN_CITIES_HIGHLIGHT_AR}. يمكنك البحث حسب المدينة أو العمل عن
        بُعد مع مواهب من أي مكان في ليبيا.
      </p>
      <div className="not-prose flex flex-wrap gap-2">
        {LIBYAN_CITIES.map((city) => (
          <Link
            key={city.slug}
            href={`/cities/${city.slug}`}
            className="rounded-full border border-outline-variant/50 px-3 py-1.5 text-sm text-on-surface-variant hover:border-primary hover:text-primary"
          >
            {city.nameAr}
          </Link>
        ))}
      </div>

      <h2>رؤيتنا</h2>
      <p>
        أن يصبح العمل الحر في ليبيا مهنة محترمة ومستدامة — حيث يجد المستقل فرصاً عادلة
        بالدينار الليبي، ويجد صاحب المشروع موهبة محلية يثق بها دون الحاجة للبحث خارج
        البلاد.
      </p>

      <h2>قيمنا</h2>
      <ul className="list-disc space-y-2 ps-6">
        <li>
          <strong>محلية أولاً:</strong> مواهب ومشاريع من ليبيا، لليبيا.
        </li>
        <li>
          <strong>شفافية:</strong> ميزانيات وعروض واضحة بالدينار الليبي ({PLATFORM_CURRENCY_CODE}).
        </li>
        <li>
          <strong>ثقة:</strong> ملفات موثّقة، تقييمات حقيقية، ومجتمع مسؤول.
        </li>
        <li>
          <strong>سهولة:</strong> تصفح بدون حساب، وتسجيل فقط عند الحاجة.
        </li>
      </ul>

      <h2>ما نقدّمه اليوم</h2>
      <ul className="list-disc space-y-2 ps-6">
        <li>نشر المشاريع واستقبال العروض بالدينار الليبي</li>
        <li>ملفات مستقلين ليبيين مع معرض أعمال وتقييمات</li>
        <li>مراسلة مدمجة وإشعارات فورية</li>
        <li>صفحات مخصصة لكل مدينة وتصنيف مهني</li>
      </ul>

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
