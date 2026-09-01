import Link from 'next/link';
import { MarketingPage } from '@/components/marketing/marketing-page';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';

export default function SitemapPage() {
  return (
    <MarketingPage title="خريطة الموقع">
      <h2>المنصة</h2>
      <ul className="list-disc space-y-1 ps-6">
        <li><Link href="/">الرئيسية</Link></li>
        <li><Link href="/projects">المشاريع</Link></li>
        <li><Link href="/freelancers">المستقلون</Link></li>
        <li><Link href="/search">بحث</Link></li>
      </ul>
      <h2>معلومات</h2>
      <ul className="list-disc space-y-1 ps-6">
        <li><Link href="/how-it-works">كيف تعمل</Link></li>
        <li><Link href="/help">مركز المساعدة</Link></li>
        <li><Link href="/escrow">نظام الضمان</Link></li>
        <li><Link href="/about">من نحن</Link></li>
        <li><Link href="/contact">اتصل بنا</Link></li>
        <li><Link href="/privacy">الخصوصية</Link></li>
        <li><Link href="/terms">الشروط</Link></li>
      </ul>
      <h2>مدن ليبيا</h2>
      <ul className="list-disc space-y-1 ps-6">
        {LIBYAN_CITIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/cities/${c.slug}`}>{c.nameAr}</Link>
          </li>
        ))}
      </ul>
      <h2>التصنيفات</h2>
      <ul className="list-disc space-y-1 ps-6">
        {MARKETPLACE_CATEGORIES.map((c) => (
          <li key={c.slug}>
            <Link href={`/categories/${c.slug}`}>{c.nameAr}</Link>
          </li>
        ))}
      </ul>
    </MarketingPage>
  );
}
