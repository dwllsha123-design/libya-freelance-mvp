export const LIBYAN_CITIES = [
  {
    nameAr: 'طرابلس',
    slug: 'tripoli',
    description:
      'توظيف مستقلين في العاصمة طرابلس — برمجة، تصميم، تسويق، وكتابة محتوى بالدينار الليبي.',
  },
  {
    nameAr: 'بنغازي',
    slug: 'benghazi',
    description:
      'اعثر على مواهب في بنغازي أو انشر مشروعك واستقبل عروضاً من مستقلين محليين موثوقين.',
  },
  {
    nameAr: 'مصراتة',
    slug: 'misrata',
    description:
      'سوق عمل حر في مصراتة يربط الشركات والأفراد بمستقلين في التقنية والإبداع والأعمال.',
  },
  {
    nameAr: 'الزاوية',
    slug: 'zawiya',
    description: 'مستقلون ومشاريع في الزاوية — فرص عمل حر محلية بميزانيات بالدينار الليبي.',
  },
  {
    nameAr: 'زليتن',
    slug: 'zliten',
    description: 'انشر مشروعك في زليتن أو تصفّح ملفات المستقلين في منطقتك.',
  },
  {
    nameAr: 'سبها',
    slug: 'sebha',
    description: 'منصة العمل الحر في الجنوب الليبي — مستقلون ومشاريع في سبها ومحيطها.',
  },
  {
    nameAr: 'البيضاء',
    slug: 'bayda',
    description: 'توظيف مستقلين في البيضاء — تصميم، تطوير، تسويق، وخدمات احترافية.',
  },
  {
    nameAr: 'درنة',
    slug: 'derna',
    description: 'اعثر على مستقلين في درنة أو انشر مشروعك واستقبل عروضاً تنافسية.',
  },
  {
    nameAr: 'طبرق',
    slug: 'tobruk',
    description: 'فرص عمل حر في طبرق — مشاريع ومستقلون بالدينار الليبي.',
  },
  {
    nameAr: 'عن بُعد',
    slug: 'remote',
    description: 'مستقلون ليبيون يعملون عن بُعد — تعاون مع مواهب من أي مدينة في ليبيا.',
  },
] as const;

export const MARKETPLACE_CATEGORIES = [
  {
    nameAr: 'البرمجة والتقنية',
    slug: 'programming-tech',
    description:
      'مطورون ليبيون في الويب، الجوال، قواعد البيانات، والذكاء الاصطناعي — مشاريع تقنية بالدينار الليبي.',
  },
  {
    nameAr: 'التصميم والجرافيك',
    slug: 'design-graphic',
    description:
      'مصممو شعارات، هويات بصرية، واجهات مستخدم، ومواد تسويقية من مستقلين في ليبيا.',
  },
  {
    nameAr: 'التسويق الإلكتروني',
    slug: 'digital-marketing',
    description:
      'خبراء تسويق رقمي، إعلانات، SEO، وتحليلات لنمو أعمالك في السوق الليبي.',
  },
  {
    nameAr: 'إدارة مواقع التواصل',
    slug: 'social-media',
    description:
      'مديرو حسابات إنستغرام، فيسبوك، تيك توك، وصناعة محتوى لعلامتك التجارية.',
  },
  {
    nameAr: 'الكتابة والترجمة',
    slug: 'writing-translation',
    description:
      'كتابة محتوى، مقالات، نصوص إعلانية، وترجمة عربية-إنجليزية لمشاريعك.',
  },
  {
    nameAr: 'الفيديو والموشن',
    slug: 'video-motion',
    description:
      'مونتاج فيديو، موشن جرافيك، وإنتاج محتوى مرئي للحملات والمنصات.',
  },
  {
    nameAr: 'المحاسبة والأعمال',
    slug: 'accounting-business',
    description:
      'محاسبون، مستشارو أعمال، وإدارة مالية للشركات والمشاريع الصغيرة في ليبيا.',
  },
  {
    nameAr: 'الهندسة والعمارة',
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

export function getCitySeoTitle(nameAr: string) {
  return `مستقلون ومشاريع في ${nameAr} | ليبي فريلانس`;
}

export function getCategorySeoTitle(nameAr: string) {
  return `${nameAr} في ليبيا | توظيف مستقلين`;
}
