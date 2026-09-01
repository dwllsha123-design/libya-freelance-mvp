import { PLATFORM_NAME_AR, PLATFORM_TAGLINE_AR } from '@/lib/branding';

export default function AdminSettingsPage() {
  return (
    <div className="rounded-xl border bg-white p-6">
      <h1 className="text-2xl font-bold">الإعدادات</h1>
      <div className="mt-6 space-y-3 text-sm text-slate-700">
        <p><strong>اسم المنصة:</strong> {PLATFORM_NAME_AR}</p>
        <p><strong>الشعار:</strong> {PLATFORM_TAGLINE_AR}</p>
        <p><strong>الحالة:</strong> MVP — لوحة إدارة تشغيلية</p>
        <p><strong>ملاحظة:</strong> لا تُعرض أسرار النظام (JWT، قاعدة البيانات، التخزين) في هذه الواجهة.</p>
        <p><strong>سياسة المشاريع:</strong> الإدارة لا تغلق مشاريع قيد التنفيذ أو مكتملة — للاطلاع فقط حتى نظام النزاعات.</p>
      </div>
    </div>
  );
}
