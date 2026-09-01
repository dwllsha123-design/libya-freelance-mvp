export interface ExpandedBrief {
  title: string;
  description: string;
}

/** يحوّل وصفاً قصيراً إلى مسودة مشروع منظّمة (بدون API خارجي) */
export function expandProjectBrief(brief: string): ExpandedBrief {
  const text = brief.trim();
  const firstLine = text.split(/[.\n]/)[0]?.trim() ?? text;
  const title =
    firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine || 'مشروع جديد';

  const description = [
    '## نظرة عامة',
    text,
    '',
    '## المخرجات المتوقعة',
    '- تنفيذ العمل وفق المواصفات المذكورة أعلاه',
    '- تسليم الملفات/الأصول النهائية بصيغة متفق عليها',
    '- مراجعة واحدة للتعديلات البسيطة (إن لزم)',
    '',
    '## المدة والميزانية',
    '- يُفضّل ذكر المدة التقديرية والميزانية بالدينار الليبي (د.ل) في العروض',
    '',
    '## ملاحظات',
    '- يمكن التواصل عبر منصة ليبي فريلانس لمزيد من التفاصيل',
  ].join('\n');

  return { title, description };
}
