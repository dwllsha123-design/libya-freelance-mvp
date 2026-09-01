import { MarketingPage } from '@/components/marketing/marketing-page';
import { PLATFORM_CURRENCY_CODE, PLATFORM_NAME_AR } from '@/lib/branding';
import Link from 'next/link';
import { ESCROW_PLATFORM_FEE_PERCENT } from '@/lib/escrow-fees';

export default function EscrowPage() {
  return (
    <MarketingPage
      title="نظام الضمان"
      subtitle="حماية المدفوعات للعميل والمستقل — بالدينار الليبي"
    >
      <p>
        نظام الضمان في {PLATFORM_NAME_AR} يحمي أموال المشروع حتى يوافق العميل على التسليم —
        بثقة للعميل وضمان للمستقل في السوق الليبي.
      </p>

      <h2>كيف يعمل؟</h2>
      <ol className="list-decimal space-y-2 ps-6">
        <li>يختار العميل عرضاً ويُموّل الضمان بمبلغ العرض ({PLATFORM_CURRENCY_CODE})</li>
        <li>تبقى الأموال محجوزة أثناء تنفيذ المشروع</li>
        <li>عند تأكيد الإتمام، يُحرَّر المبلغ للمستقل (بعد عمولة المنصة {ESCROW_PLATFORM_FEE_PERCENT}%)</li>
        <li>في حال النزاع، يتدخل فريق الإدارة لحل الاختلاف</li>
      </ol>

      <h2>للعملاء</h2>
      <ul className="list-disc space-y-2 ps-6">
        <li>لا تدفع للمستقل مباشرة — المبلغ محمي حتى رضاك عن العمل</li>
        <li>يمكنك فتح نزاع إذا لم يُنفَّذ العمل كما اتُفق</li>
      </ul>

      <h2>للمستقلين</h2>
      <ul className="list-disc space-y-2 ps-6">
        <li>اطمئن أن المبلغ مموّل قبل بدء العمل الجاد</li>
        <li>يُحرَّر مستحقك تلقائياً عند تأكيد العميل للإتمام</li>
      </ul>

      <p className="rounded-lg bg-surface-container-low p-4 text-sm text-on-surface-variant">
        التمويل الحالي محاكى للتجربة (MVP) — سيتم ربط بوابة دفع ليبية قريباً. جميع المبالغ
        بالدينار الليبي ({PLATFORM_CURRENCY_CODE}).
      </p>

      <div className="flex flex-wrap gap-4">
        <Link
          href="/dashboard/escrow"
          className="rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          سجل الضمان
        </Link>
        <Link
          href="/contact"
          className="rounded-lg border border-secondary px-6 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary/5"
        >
          استفسار عن الدفع
        </Link>
      </div>
    </MarketingPage>
  );
}
