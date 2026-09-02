import type { AppLocale } from '@/i18n/routing';

export interface ExpandedBrief {
  title: string;
  description: string;
}

const TEMPLATES = {
  ar: {
    defaultTitle: 'مشروع جديد',
    overview: '## نظرة عامة',
    deliverables: '## المخرجات المتوقعة',
    deliverable1: '- تنفيذ العمل وفق المواصفات المذكورة أعلاه',
    deliverable2: '- تسليم الملفات/الأصول النهائية بصيغة متفق عليها',
    deliverable3: '- مراجعة واحدة للتعديلات البسيطة (إن لزم)',
    budget: '## المدة والميزانية',
    budgetNote: '- يُفضّل ذكر المدة التقديرية والميزانية بالدينار الليبي (د.ل) في العروض',
    notes: '## ملاحظات',
    notesBody: '- يمكن التواصل عبر منصة ليبي فريلانس لمزيد من التفاصيل',
  },
  en: {
    defaultTitle: 'New project',
    overview: '## Overview',
    deliverables: '## Expected deliverables',
    deliverable1: '- Complete the work according to the specifications above',
    deliverable2: '- Deliver final files/assets in an agreed format',
    deliverable3: '- One round of minor revisions (if needed)',
    budget: '## Timeline & budget',
    budgetNote: '- Please include estimated timeline and budget in Libyan Dinar (LYD) in proposals',
    notes: '## Notes',
    notesBody: '- Contact via Libyi Freelance for more details',
  },
} as const;

/** Turns a short brief into a structured project draft (no external API). */
export function expandProjectBrief(brief: string, locale: AppLocale = 'ar'): ExpandedBrief {
  const t = TEMPLATES[locale];
  const text = brief.trim();
  const firstLine = text.split(/[.\n]/)[0]?.trim() ?? text;
  const title =
    firstLine.length > 100 ? `${firstLine.slice(0, 97)}...` : firstLine || t.defaultTitle;

  const description = [
    t.overview,
    text,
    '',
    t.deliverables,
    t.deliverable1,
    t.deliverable2,
    t.deliverable3,
    '',
    t.budget,
    t.budgetNote,
    '',
    t.notes,
    t.notesBody,
  ].join('\n');

  return { title, description };
}
