import Link from 'next/link';
import { PLATFORM_TAGLINE_AR } from '@/lib/branding';

export default function HomePage() {
  return (
    <>
      <section className="bg-[#0B132B] px-4 py-20 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-sm font-medium text-[#00A86B] sm:text-base">
            {PLATFORM_TAGLINE_AR}
          </p>
          <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">
            حوّل مهارتك إلى دخل
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-200">
            منصة تجمع المستقلين وأصحاب المشاريع في ليبيا — انشر مشروعك أو قدّم عروضك وابدأ العمل بثقة.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="rounded-lg bg-[#00A86B] px-6 py-3 font-semibold text-white"
            >
              ابدأ كمستقل
            </Link>
            <Link
              href="/register"
              className="rounded-lg border border-white/30 px-6 py-3 font-semibold text-white"
            >
              انشر مشروع
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-2xl font-bold text-[#0B132B]">كيف تعمل المنصة</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {[
            'أنشئ حسابك كمستقل أو عميل',
            'انشر مشروعك أو قدّم عروضك',
            'تواصل وأنجز المشروع ثم قيّم التجربة',
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <span className="text-sm font-bold text-[#00A86B]">
                {index + 1}
              </span>
              <p className="mt-2 font-medium text-[#0B132B]">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
