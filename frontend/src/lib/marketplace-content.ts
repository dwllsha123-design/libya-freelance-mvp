import type { AppLocale } from '@/i18n/routing';

export const LIBYAN_CITIES = [
  {
    nameAr: 'طرابلس',
    nameEn: 'Tripoli',
    slug: 'tripoli',
    description:
      'توظيف مستقلين في العاصمة طرابلس — برمجة، تصميم، تسويق، وكتابة محتوى بالدينار الليبي.',
  },
  {
    nameAr: 'بنغازي',
    nameEn: 'Benghazi',
    slug: 'benghazi',
    description:
      'اعثر على مواهب في بنغازي أو انشر مشروعك واستقبل عروضاً من مستقلين محليين موثوقين.',
  },
  {
    nameAr: 'مصراتة',
    nameEn: 'Misrata',
    slug: 'misrata',
    description:
      'سوق عمل حر في مصراتة يربط الشركات والأفراد بمستقلين في التقنية والإبداع والأعمال.',
  },
  {
    nameAr: 'الزاوية',
    nameEn: 'Zawiya',
    slug: 'zawiya',
    description: 'مستقلون ومشاريع في الزاوية — فرص عمل حر محلية بميزانيات بالدينار الليبي.',
  },
  {
    nameAr: 'زليتن',
    nameEn: 'Zliten',
    slug: 'zliten',
    description: 'انشر مشروعك في زليتن أو تصفّح ملفات المستقلين في منطقتك.',
  },
  {
    nameAr: 'سبها',
    nameEn: 'Sebha',
    slug: 'sebha',
    description: 'منصة العمل الحر في الجنوب الليبي — مستقلون ومشاريع في سبها ومحيطها.',
  },
  {
    nameAr: 'البيضاء',
    nameEn: 'Bayda',
    slug: 'bayda',
    description: 'توظيف مستقلين في البيضاء — تصميم، تطوير، تسويق، وخدمات احترافية.',
  },
  {
    nameAr: 'درنة',
    nameEn: 'Derna',
    slug: 'derna',
    description: 'اعثر على مستقلين في درنة أو انشر مشروعك واستقبل عروضاً تنافسية.',
  },
  {
    nameAr: 'طبرق',
    nameEn: 'Tobruk',
    slug: 'tobruk',
    description: 'فرص عمل حر في طبرق — مشاريع ومستقلون بالدينار الليبي.',
  },
  {
    nameAr: 'عن بُعد',
    nameEn: 'Remote',
    slug: 'remote',
    description: 'مستقلون ليبيون يعملون عن بُعد — تعاون مع مواهب من أي مدينة في ليبيا.',
  },
] as const;

export const MARKETPLACE_CATEGORIES = [
  {
    nameAr: 'البرمجة والتقنية',
    nameEn: 'Programming & Tech',
    slug: 'programming-tech',
    description:
      'مطورون ليبيون في الويب، الجوال، قواعد البيانات، والذكاء الاصطناعي — مشاريع تقنية بالدينار الليبي.',
  },
  {
    nameAr: 'التصميم والجرافيك',
    nameEn: 'Design & Graphic',
    slug: 'design-graphic',
    description:
      'مصممو شعارات، هويات بصرية، واجهات مستخدم، ومواد تسويقية من مستقلين في ليبيا.',
  },
  {
    nameAr: 'التسويق الإلكتروني',
    nameEn: 'Digital Marketing',
    slug: 'digital-marketing',
    description:
      'خبراء تسويق رقمي، إعلانات، SEO، وتحليلات لنمو أعمالك في السوق الليبي.',
  },
  {
    nameAr: 'إدارة مواقع التواصل',
    nameEn: 'Social Media',
    slug: 'social-media',
    description:
      'مديرو حسابات إنستغرام، فيسبوك، تيك توك، وصناعة محتوى لعلامتك التجارية.',
  },
  {
    nameAr: 'الكتابة والترجمة',
    nameEn: 'Writing & Translation',
    slug: 'writing-translation',
    description:
      'كتابة محتوى، مقالات، نصوص إعلانية، وترجمة عربية-إنجليزية لمشاريعك.',
  },
  {
    nameAr: 'الفيديو والموشن',
    nameEn: 'Video & Motion',
    slug: 'video-motion',
    description:
      'مونتاج فيديو، موشن جرافيك، وإنتاج محتوى مرئي للحملات والمنصات.',
  },
  {
    nameAr: 'المحاسبة والأعمال',
    nameEn: 'Accounting & Business',
    slug: 'accounting-business',
    description:
      'محاسبون، مستشارو أعمال، وإدارة مالية للشركات والمشاريع الصغيرة في ليبيا.',
  },
  {
    nameAr: 'الهندسة والعمارة',
    nameEn: 'Engineering & Architecture',
    slug: 'engineering-architecture',
    description:
      'مهندسون ومعماريون لمشاريع البناء، التصميم الهندسي، والمخططات.',
  },
] as const;

export const EXAMPLE_PROJECT_BRIEFS = [
  'شعار وهوية بصرية لشركة ليبية ناشئة في طرابلس',
  'موقع ووردبريس مع نموذج حجز لعيادة في بنغازي',
  'مدير وسائل تواصل لمحتوى إنستغرام وتيك توك',
  'محرر فيديو قصير لحملة ترويجية في ليبيا',
  'إعداد حملة Google Ads لمتجر إلكتروني',
  'تطبيق جوال بـ Flutter لخدمة توصيل محلية',
];

export const TRUST_BADGES = [
  '🇱🇾 منصة ليبية',
  'النشر مجاني',
  'تصفح بدون حساب',
  'المدفوعات بالدينار الليبي',
];

export function getCityBySlug(slug: string) {
  return LIBYAN_CITIES.find((c) => c.slug === slug);
}

export function getCategoryBySlug(slug: string) {
  return MARKETPLACE_CATEGORIES.find((c) => c.slug === slug);
}

export function getCategorySeoTitle(name: string, locale: AppLocale = 'ar') {
  return locale === 'en'
    ? `${name} in Libya | Hire freelancers`
    : `${name} في ليبيا | توظيف مستقلين`;
}

export function getCitySeoTitle(name: string, locale: AppLocale = 'ar') {
  return locale === 'en'
    ? `Freelancers & projects in ${name} | Libyi Freelance`
    : `مستقلون ومشاريع في ${name} | ليبي فريلانس`;
}

export function getExampleProjectBriefs(locale: AppLocale): string[] {
  if (locale === 'en') {
    return [
      'Logo and brand identity for a Libyan startup in Tripoli',
      'WordPress site with booking form for a clinic in Benghazi',
      'Social media manager for Instagram and TikTok content',
      'Short-form video editor for a Libyan promotional campaign',
      'Google Ads setup for an e-commerce store',
      'Flutter mobile app for a local delivery service',
    ];
  }
  return [...EXAMPLE_PROJECT_BRIEFS];
}

export function getTrustBadges(locale: AppLocale): string[] {
  if (locale === 'en') {
    return [
      '🇱🇾 Libyan platform',
      'Free to post',
      'Browse without account',
      'Payments in Libyan Dinar',
    ];
  }
  return [...TRUST_BADGES];
}
