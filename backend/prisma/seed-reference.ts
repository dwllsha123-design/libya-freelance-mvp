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
  {
    nameAr: 'طرابلس',
    nameEn: 'Tripoli',
    slug: 'tripoli',
    country: 'Libya',
    sortOrder: 1,
  },
  {
    nameAr: 'بنغازي',
    nameEn: 'Benghazi',
    slug: 'benghazi',
    country: 'Libya',
    sortOrder: 2,
  },
  {
    nameAr: 'مصراتة',
    nameEn: 'Misrata',
    slug: 'misrata',
    country: 'Libya',
    sortOrder: 3,
  },
  {
    nameAr: 'الزاوية',
    nameEn: 'Zawiya',
    slug: 'zawiya',
    country: 'Libya',
    sortOrder: 4,
  },
  {
    nameAr: 'زليتن',
    nameEn: 'Zliten',
    slug: 'zliten',
    country: 'Libya',
    sortOrder: 5,
  },
  {
    nameAr: 'الخمس',
    nameEn: 'Khoms',
    slug: 'khoms',
    country: 'Libya',
    sortOrder: 6,
  },
  {
    nameAr: 'سبها',
    nameEn: 'Sebha',
    slug: 'sebha',
    country: 'Libya',
    sortOrder: 7,
  },
  {
    nameAr: 'البيضاء',
    nameEn: 'Bayda',
    slug: 'bayda',
    country: 'Libya',
    sortOrder: 8,
  },
  {
    nameAr: 'درنة',
    nameEn: 'Derna',
    slug: 'derna',
    country: 'Libya',
    sortOrder: 9,
  },
  {
    nameAr: 'طبرق',
    nameEn: 'Tobruk',
    slug: 'tobruk',
    country: 'Libya',
    sortOrder: 10,
  },
  {
    nameAr: 'أمستردام',
    nameEn: 'Amsterdam',
    slug: 'amsterdam',
    country: 'Netherlands',
    sortOrder: 1,
  },
  {
    nameAr: 'روتردام',
    nameEn: 'Rotterdam',
    slug: 'rotterdam',
    country: 'Netherlands',
    sortOrder: 2,
  },
  {
    nameAr: 'لاهاي',
    nameEn: 'The Hague',
    slug: 'the-hague',
    country: 'Netherlands',
    sortOrder: 3,
  },
  {
    nameAr: 'أوترخت',
    nameEn: 'Utrecht',
    slug: 'utrecht',
    country: 'Netherlands',
    sortOrder: 4,
  },
  {
    nameAr: 'أيندهوفن',
    nameEn: 'Eindhoven',
    slug: 'eindhoven',
    country: 'Netherlands',
    sortOrder: 5,
  },
  {
    nameAr: 'خرونينجن',
    nameEn: 'Groningen',
    slug: 'groningen',
    country: 'Netherlands',
    sortOrder: 6,
  },
  {
    nameAr: 'تيلبورخ',
    nameEn: 'Tilburg',
    slug: 'tilburg',
    country: 'Netherlands',
    sortOrder: 7,
  },
  {
    nameAr: 'ألمير',
    nameEn: 'Almere',
    slug: 'almere',
    country: 'Netherlands',
    sortOrder: 8,
  },
  {
    nameAr: 'بريدا',
    nameEn: 'Breda',
    slug: 'breda',
    country: 'Netherlands',
    sortOrder: 9,
  },
  {
    nameAr: 'نايميخن',
    nameEn: 'Nijmegen',
    slug: 'nijmegen',
    country: 'Netherlands',
    sortOrder: 10,
  },
  {
    nameAr: 'هارلم',
    nameEn: 'Haarlem',
    slug: 'haarlem',
    country: 'Netherlands',
    sortOrder: 11,
  },
  {
    nameAr: 'آرنم',
    nameEn: 'Arnhem',
    slug: 'arnhem',
    country: 'Netherlands',
    sortOrder: 12,
  },
  {
    nameAr: 'عن بُعد',
    nameEn: 'Remote',
    slug: 'remote',
    country: 'Libya',
    sortOrder: 99,
    isRemote: true,
  },
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
        nameEn: city.nameEn,
        slug: city.slug,
        country: city.country,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
      },
      update: {
        nameAr: city.nameAr,
        nameEn: city.nameEn,
        country: city.country,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
      },
    });
  }
}
