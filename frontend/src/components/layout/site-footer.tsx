import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import {
  PLATFORM_COUNTRY_AR,
  PLATFORM_FLAG,
  PLATFORM_NAME_AR,
  PLATFORM_TAGLINE_AR,
} from '@/lib/branding';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';

export function SiteFooter() {
  return (
    <footer className="border-t border-outline-variant/40 bg-secondary text-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-sm">
            <Logo href="/" nameClassName="!text-white" />
            <p className="mt-3 text-sm text-slate-300">{PLATFORM_TAGLINE_AR}</p>
            <p className="mt-2 text-xs text-slate-400">
              {PLATFORM_FLAG} من أجل المواهب الليبية — {PLATFORM_COUNTRY_AR}
            </p>
          </div>

          <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-sm font-semibold">المنصة</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/projects" className="hover:text-white">تصفح المشاريع</Link></li>
                <li><Link href="/freelancers" className="hover:text-white">البحث عن مستقلين</Link></li>
                <li><Link href="/search" className="hover:text-white">بحث متقدم</Link></li>
                <li>
                  <Link
                    href="/register?role=CLIENT&next=/dashboard/projects/new"
                    className="hover:text-white"
                  >
                    نشر مشروع
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">موارد</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/how-it-works" className="hover:text-white">كيف يعمل</Link></li>
                <li><Link href="/escrow" className="hover:text-white">نظام الضمان</Link></li>
                <li><Link href="/help" className="hover:text-white">مركز المساعدة</Link></li>
                <li><Link href="/sitemap" className="hover:text-white">خريطة الموقع</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">الشركة</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li><Link href="/about" className="hover:text-white">من نحن</Link></li>
                <li><Link href="/contact" className="hover:text-white">اتصل بنا</Link></li>
                <li><Link href="/privacy" className="hover:text-white">سياسة الخصوصية</Link></li>
                <li><Link href="/terms" className="hover:text-white">شروط الخدمة</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold">مدن ليبيا</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                {LIBYAN_CITIES.slice(0, 6).map((city) => (
                  <li key={city.slug}>
                    <Link href={`/cities/${city.slug}`} className="hover:text-white">
                      {city.nameAr}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2 border-t border-white/10 pt-6">
          {MARKETPLACE_CATEGORIES.slice(0, 6).map((cat) => (
            <Link
              key={cat.slug}
              href={`/categories/${cat.slug}`}
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/20"
            >
              {cat.nameAr}
            </Link>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {PLATFORM_NAME_AR}. من أجل المواهب الليبية {PLATFORM_FLAG}
          </p>
          <p>المدفوعات بالدينار الليبي (د.ل)</p>
        </div>
      </div>
    </footer>
  );
}
