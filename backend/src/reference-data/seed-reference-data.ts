import type { PrismaClient } from '@prisma/client';

export const REFERENCE_CATEGORIES = [
  { nameAr: 'البرمجة والتقنية', slug: 'programming-tech', sortOrder: 1 },
  { nameAr: 'الذكاء الاصطناعي', slug: 'ai', sortOrder: 2 },
  { nameAr: 'التصميم والجرافيك', slug: 'design-graphic', sortOrder: 3 },
  { nameAr: 'التسويق الإلكتروني', slug: 'digital-marketing', sortOrder: 4 },
  { nameAr: 'إدارة مواقع التواصل', slug: 'social-media', sortOrder: 5 },
  { nameAr: 'الكتابة والترجمة', slug: 'writing-translation', sortOrder: 6 },
  { nameAr: 'الفيديو والموشن', slug: 'video-motion', sortOrder: 7 },
  { nameAr: 'المحاسبة والأعمال', slug: 'accounting-business', sortOrder: 8 },
  { nameAr: 'الهندسة والعمارة', slug: 'engineering-architecture', sortOrder: 9 },
  { nameAr: 'التصوير', slug: 'photography', sortOrder: 10 },
  { nameAr: 'التعليق الصوتي', slug: 'voice-over', sortOrder: 11 },
  { nameAr: 'إدخال البيانات', slug: 'data-entry', sortOrder: 12 },
  { nameAr: 'التعليم والتدريب', slug: 'education-training', sortOrder: 13 },
  { nameAr: 'الاستشارات', slug: 'consulting', sortOrder: 14 },
] as const;

export const REFERENCE_SKILLS = [
  'React',
  'Next.js',
  'Node.js',
  'NestJS',
  'Flutter',
  'Figma',
  'UI/UX',
  'Graphic Design',
  'Digital Marketing',
  'Social Media',
  'Artificial Intelligence',
  'Data Analysis',
  'Video Editing',
  'Translation',
  'Accounting',
] as const;

export const REFERENCE_CITIES = [
  { nameAr: 'طرابلس', slug: 'tripoli', sortOrder: 1 },
  { nameAr: 'بنغازي', slug: 'benghazi', sortOrder: 2 },
  { nameAr: 'مصراتة', slug: 'misrata', sortOrder: 3 },
  { nameAr: 'الزاوية', slug: 'zawiya', sortOrder: 4 },
  { nameAr: 'زليتن', slug: 'zliten', sortOrder: 5 },
  { nameAr: 'الخمس', slug: 'khoms', sortOrder: 6 },
  { nameAr: 'سبها', slug: 'sebha', sortOrder: 7 },
  { nameAr: 'البيضاء', slug: 'bayda', sortOrder: 8 },
  { nameAr: 'درنة', slug: 'derna', sortOrder: 9 },
  { nameAr: 'طبرق', slug: 'tobruk', sortOrder: 10 },
  { nameAr: 'عن بُعد', slug: 'remote', sortOrder: 99, isRemote: true },
] as const;

export function slugifySkillName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_/]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Idempotent upsert of categories, skills, and Libyan cities. */
export async function seedReferenceData(prisma: PrismaClient) {
  for (const category of REFERENCE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: {
        nameAr: category.nameAr,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
      update: {
        nameAr: category.nameAr,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  for (const name of REFERENCE_SKILLS) {
    const slug = slugifySkillName(name);
    await prisma.skill.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    });
  }

  for (const city of REFERENCE_CITIES) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      create: {
        nameAr: city.nameAr,
        slug: city.slug,
        sortOrder: city.sortOrder,
        isRemote: 'isRemote' in city ? Boolean(city.isRemote) : false,
        isActive: true,
      },
      update: {
        nameAr: city.nameAr,
        sortOrder: city.sortOrder,
        isRemote: 'isRemote' in city ? Boolean(city.isRemote) : false,
        isActive: true,
      },
    });
  }
}
