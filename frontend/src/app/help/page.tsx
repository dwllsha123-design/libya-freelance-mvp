import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { PLATFORM_NAME_AR } from '@/lib/branding';
import { buildPageMetadata } from '@/lib/seo';
import { VERIFICATION_CRITERIA_AR } from '@/lib/freelancer-trust';

export const metadata: Metadata = buildPageMetadata({
  title: 'مركز المساعدة',
  description: `أسئلة شائعة حول ${PLATFORM_NAME_AR} — التسجيل، نشر المشاريع، العروض، التقييمات، والدينار الليبي.`,
  path: '/help',
});

const FAQ_SECTIONS = [
  {
    title: 'البداية',
    items: [
      {
        q: `ما هي ${PLATFORM_NAME_AR}؟`,
        a: 'سوق عمل حر ليبي يربط العملاء (شركات وأفراد) بالمستقلين المحليين في التطوير والتصميم والتسويق والكتابة وغيرها. الميزانيات بالدينار الليبي.',
      },
      {
        q: 'هل أحتاج حساباً للتصفح؟',
        a: 'لا. يمكنك تصفح المشاريع والمستقلين بحرية. الحساب مطلوب فقط عند نشر مشروع أو تقديم عرض.',
      },
      {
        q: 'ما العملة المستخدمة؟',
        a: 'الدينار الليبي (د.ل / LYD) في جميع الميزانيات والعروض.',
      },
    ],
  },
  {
    title: 'للعملاء',
    items: [
      {
        q: 'كيف أنشر مشروعاً؟',
        a: 'من الصفحة الرئيسية استخدم نموذج «انشر مشروع» أو سجّل كعميل وانتقل إلى لوحة التحكم → مشروع جديد. يمكنك أيضاً استخدام مساعد الإعلان لتحضير مسودة.',
      },
      {
        q: 'كم يستغرق استقبال العروض؟',
        a: 'يعتمد على نوع المشروع والميزانية. المشاريع الواضحة والميزانية المناسبة تجذب عروضاً أسرع.',
      },
      {
        q: 'كيف أختار المستقل المناسب؟',
        a: 'قارن العروض، راجع ملف المستقل وتقييماته ومشاريعه المكتملة، وتواصل معه قبل القبول.',
      },
    ],
  },
  {
    title: 'للمستقلين',
    items: [
      {
        q: 'كيف أحصل على مشاريع؟',
        a: 'أكمل ملفك (صورة، نبذة، مهارات، معرض أعمال)، تصفّح المشاريع المفتوحة، وقدّم عروضاً مخصصة.',
      },
      {
        q: 'ما معنى «مستقل موثّق»؟',
        a: `شارة تُمنح عند: ${VERIFICATION_CRITERIA_AR.join('، ')}.`,
      },
      {
        q: 'هل يمكنني العمل عن بُعد؟',
        a: 'نعم. يمكنك تحديد نمط العمل (حضوري، عن بُعد، أو هجين) في ملفك الشخصي.',
      },
    ],
  },
  {
    title: 'الأمان والمدفوعات',
    items: [
      {
        q: 'هل يوجد نظام ضمان؟',
        a: 'نعم. عند قبول عرض، يُموَّل الضمان بمبلغ العرض بالدينار الليبي. يُحرَّر المبلغ للمستقل عند تأكيد إتمام المشروع.',
      },
      {
        q: 'كيف أبلّغ عن مشكلة؟',
        a: 'تواصل معنا عبر صفحة اتصل بنا مع تفاصيل المشكلة. نراجع البلاغات ونتخذ الإجراء المناسب.',
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <MarketingPage title="مركز المساعدة" subtitle="أسئلة شائعة وروابط مفيدة">
      {FAQ_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2>{section.title}</h2>
          <div className="not-prose space-y-4">
            {section.items.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-outline-variant/40 bg-surface p-5"
              >
                <h3 className="font-semibold text-on-surface">{item.q}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      <h2>روابط سريعة</h2>
      <ul className="list-disc space-y-2 ps-6">
        <li>
          <Link href="/how-it-works">كيف تعمل المنصة — دليل مفصّل</Link>
        </li>
        <li>
          <Link href="/escrow">نظام الضمان</Link>
        </li>
        <li>
          <Link href="/privacy">سياسة الخصوصية</Link>
        </li>
        <li>
          <Link href="/terms">شروط الخدمة</Link>
        </li>
        <li>
          <Link href="/contact">اتصل بنا</Link>
        </li>
      </ul>
    </MarketingPage>
  );
}
