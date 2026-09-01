import type { PrismaClient } from '@prisma/client';

export const categories = [
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
];

export const skills = [
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
];

export const cities = [
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
];

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_/]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function seedReferenceData(prisma: PrismaClient) {
  for (const category of categories) {
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

  for (const name of skills) {
    const slug = slugify(name);
    await prisma.skill.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    });
  }

  for (const city of cities) {
    await prisma.city.upsert({
      where: { slug: city.slug },
      create: {
        nameAr: city.nameAr,
        slug: city.slug,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
      },
      update: {
        nameAr: city.nameAr,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
      },
    });
  }
}
