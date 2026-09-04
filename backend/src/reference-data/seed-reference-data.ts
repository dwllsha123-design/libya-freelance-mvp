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

type ReferenceCity = {
  nameAr: string;
  slug: string;
  country: string;
  sortOrder: number;
  isRemote?: boolean;
};

export const REFERENCE_CITIES: ReferenceCity[] = [
  // Libya
  { nameAr: 'طرابلس', slug: 'tripoli', country: 'Libya', sortOrder: 1 },
  { nameAr: 'بنغازي', slug: 'benghazi', country: 'Libya', sortOrder: 2 },
  { nameAr: 'مصراتة', slug: 'misrata', country: 'Libya', sortOrder: 3 },
  { nameAr: 'الزاوية', slug: 'zawiya', country: 'Libya', sortOrder: 4 },
  { nameAr: 'زليتن', slug: 'zliten', country: 'Libya', sortOrder: 5 },
  { nameAr: 'الخمس', slug: 'khoms', country: 'Libya', sortOrder: 6 },
  { nameAr: 'سبها', slug: 'sebha', country: 'Libya', sortOrder: 7 },
  { nameAr: 'البيضاء', slug: 'bayda', country: 'Libya', sortOrder: 8 },
  { nameAr: 'درنة', slug: 'derna', country: 'Libya', sortOrder: 9 },
  { nameAr: 'طبرق', slug: 'tobruk', country: 'Libya', sortOrder: 10 },
  { nameAr: 'عن بُعد', slug: 'remote', country: 'Libya', sortOrder: 99, isRemote: true },

  // Tunisia
  { nameAr: 'تونس', slug: 'tunis', country: 'Tunisia', sortOrder: 1 },
  { nameAr: 'صفاقس', slug: 'sfax', country: 'Tunisia', sortOrder: 2 },
  { nameAr: 'سوسة', slug: 'sousse', country: 'Tunisia', sortOrder: 3 },
  { nameAr: 'القيروان', slug: 'kairouan', country: 'Tunisia', sortOrder: 4 },
  { nameAr: 'بنزرت', slug: 'bizerte', country: 'Tunisia', sortOrder: 5 },
  { nameAr: 'قابس', slug: 'gabes', country: 'Tunisia', sortOrder: 6 },
  { nameAr: 'نابل', slug: 'nabeul', country: 'Tunisia', sortOrder: 7 },
  { nameAr: 'المنستير', slug: 'monastir', country: 'Tunisia', sortOrder: 8 },
  { nameAr: 'عن بُعد', slug: 'remote', country: 'Tunisia', sortOrder: 99, isRemote: true },

  // Egypt
  { nameAr: 'القاهرة', slug: 'cairo', country: 'Egypt', sortOrder: 1 },
  { nameAr: 'الإسكندرية', slug: 'alexandria', country: 'Egypt', sortOrder: 2 },
  { nameAr: 'الجيزة', slug: 'giza', country: 'Egypt', sortOrder: 3 },
  { nameAr: 'المنصورة', slug: 'mansoura', country: 'Egypt', sortOrder: 4 },
  { nameAr: 'طنطا', slug: 'tanta', country: 'Egypt', sortOrder: 5 },
  { nameAr: 'أسوان', slug: 'aswan', country: 'Egypt', sortOrder: 6 },
  { nameAr: 'الأقصر', slug: 'luxor', country: 'Egypt', sortOrder: 7 },
  { nameAr: 'بورسعيد', slug: 'port-said', country: 'Egypt', sortOrder: 8 },
  { nameAr: 'عن بُعد', slug: 'remote', country: 'Egypt', sortOrder: 99, isRemote: true },

  // Algeria
  { nameAr: 'الجزائر', slug: 'algiers', country: 'Algeria', sortOrder: 1 },
  { nameAr: 'وهران', slug: 'oran', country: 'Algeria', sortOrder: 2 },
  { nameAr: 'قسنطينة', slug: 'constantine', country: 'Algeria', sortOrder: 3 },
  { nameAr: 'عنابة', slug: 'annaba', country: 'Algeria', sortOrder: 4 },
  { nameAr: 'سطيف', slug: 'setif', country: 'Algeria', sortOrder: 5 },
  { nameAr: 'باتنة', slug: 'batna', country: 'Algeria', sortOrder: 6 },
  { nameAr: 'تلمسان', slug: 'tlemcen', country: 'Algeria', sortOrder: 7 },
  { nameAr: 'بجاية', slug: 'bejaia', country: 'Algeria', sortOrder: 8 },
  { nameAr: 'عن بُعد', slug: 'remote', country: 'Algeria', sortOrder: 99, isRemote: true },

  // Morocco
  { nameAr: 'الرباط', slug: 'rabat', country: 'Morocco', sortOrder: 1 },
  { nameAr: 'الدار البيضاء', slug: 'casablanca', country: 'Morocco', sortOrder: 2 },
  { nameAr: 'مراكش', slug: 'marrakesh', country: 'Morocco', sortOrder: 3 },
  { nameAr: 'فاس', slug: 'fez', country: 'Morocco', sortOrder: 4 },
  { nameAr: 'طنجة', slug: 'tangier', country: 'Morocco', sortOrder: 5 },
  { nameAr: 'أكادير', slug: 'agadir', country: 'Morocco', sortOrder: 6 },
  { nameAr: 'مكناس', slug: 'meknes', country: 'Morocco', sortOrder: 7 },
  { nameAr: 'وجدة', slug: 'oujda', country: 'Morocco', sortOrder: 8 },
  { nameAr: 'عن بُعد', slug: 'remote', country: 'Morocco', sortOrder: 99, isRemote: true },
];

export function slugifySkillName(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_/]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Idempotent upsert of categories, skills, and country-scoped cities. */
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
      where: {
        country_slug: {
          country: city.country,
          slug: city.slug,
        },
      },
      create: {
        nameAr: city.nameAr,
        slug: city.slug,
        country: city.country,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
      },
      update: {
        nameAr: city.nameAr,
        sortOrder: city.sortOrder,
        isRemote: city.isRemote ?? false,
        isActive: true,
        country: city.country,
      },
    });
  }
}
