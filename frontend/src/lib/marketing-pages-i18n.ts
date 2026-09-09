import type { AppLocale } from '@/i18n/routing';
import {
  LIBYAN_CITIES_HIGHLIGHT_AR,
  PLATFORM_COUNTRY_AR,
  PLATFORM_CURRENCY_AR,
  PLATFORM_CURRENCY_CODE,
  PLATFORM_FLAG,
  PLATFORM_MISSION_AR,
  PLATFORM_NAME_AR,
  PLATFORM_NAME_EN,
  PLATFORM_TAGLINE_AR,
} from '@/lib/branding';
// Marketing copy uses configured default as display fallback; live fee is DB-driven
const ESCROW_PLATFORM_FEE_PERCENT = 10;

export interface MarketingValueItem {
  title: string;
  body: string;
}

export interface MarketingFaqItem {
  q: string;
  a: string;
}

export interface MarketingFaqSection {
  title: string;
  items: MarketingFaqItem[];
}

export interface MarketingStep {
  title: string;
  body: string;
}

export interface MarketingLinkItem {
  href: string;
  label: string;
}

export interface MarketingSitemapSection {
  title: string;
  links: MarketingLinkItem[];
}

export interface AboutPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  intro: string;
  missionHeading: string;
  missionBody: string;
  whyLibyanHeading: string;
  whyLibyanBody: string;
  citiesHeading: string;
  citiesBody: string;
  visionHeading: string;
  visionBody: string;
  valuesHeading: string;
  values: MarketingValueItem[];
  offeringsHeading: string;
  offerings: string[];
}

export interface ContactPageContent {
  title: string;
  subtitle: string;
  intro: string;
  emailLabel: string;
  marketLabel: string;
  marketValue: string;
  currencyLabel: string;
  currencyValue: string;
  formNote: string;
}

export interface HelpPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  sections: MarketingFaqSection[];
  quickLinksHeading: string;
  quickLinks: MarketingLinkItem[];
}

export interface HowItWorksPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  subtitle: string;
  intro: string;
  clientHeading: string;
  clientSteps: MarketingStep[];
  freelancerHeading: string;
  freelancerSteps: MarketingStep[];
  verifiedHeading: string;
  verifiedIntro: string;
  verificationCriteria: string[];
  currencyHeading: string;
  currencyBeforeLink: string;
  currencyLinkLabel: string;
  currencyAfterLink: string;
}

export interface EscrowPageContent {
  title: string;
  subtitle: string;
  intro: string;
  howHeading: string;
  howSteps: string[];
  forClientsHeading: string;
  forClientsItems: string[];
  forFreelancersHeading: string;
  forFreelancersItems: string[];
  mvpNote: string;
}

export interface PrivacyPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: {
    heading: string;
    paragraphs?: string[];
    items?: { title: string; body: string }[];
    beforeContactLink?: string;
    contactLinkLabel?: string;
    afterContactLink?: string;
  }[];
}

export interface TermsPageContent {
  metaTitle: string;
  metaDescription: string;
  title: string;
  lastUpdated: string;
  intro: string;
  sections: {
    heading: string;
    paragraphs?: string[];
    items?: { title: string; body: string }[];
    beforeEscrowLink?: string;
    escrowLinkLabel?: string;
    afterEscrowLink?: string;
    beforeContactLink?: string;
    contactLinkLabel?: string;
    afterContactLink?: string;
    beforePrivacyLink?: string;
    privacyLinkLabel?: string;
    afterPrivacyLink?: string;
  }[];
}

export interface SitemapPageContent {
  title: string;
  sections: MarketingSitemapSection[];
}

export interface MarketingPagesContent {
  about: AboutPageContent;
  contact: ContactPageContent;
  help: HelpPageContent;
  howItWorks: HowItWorksPageContent;
  escrow: EscrowPageContent;
  privacy: PrivacyPageContent;
  terms: TermsPageContent;
  sitemap: SitemapPageContent;
}

const VERIFICATION_CRITERIA_AR = [
  'بريد إلكتروني مُفعَّل',
  'صورة شخصية ونبذة مهنية',
  'مهارة واحدة على الأقل',
  'مشروع مكتمل واحد على الأقل',
  'تقييم 4 نجوم فأعلى',
] as const;

const VERIFICATION_CRITERIA_EN = [
  'Verified email address',
  'Profile photo and professional bio',
  'At least one skill',
  'At least one completed project',
  '4-star rating or higher',
] as const;

const AR_CONTENT: MarketingPagesContent = {
  about: {
    metaTitle: `من نحن — ${PLATFORM_NAME_AR}`,
    metaDescription: `${PLATFORM_NAME_AR} — ${PLATFORM_TAGLINE_AR}. منصة ليبية تربط أصحاب المشاريع بالمواهب المحلية في طرابلس وبنغازي ومصراتة — بالدينار الليبي.`,
    title: `من نحن — ${PLATFORM_NAME_AR}`,
    subtitle: PLATFORM_TAGLINE_AR,
    intro: `${PLATFORM_FLAG} ${PLATFORM_NAME_AR} منصة عمل حر ${PLATFORM_COUNTRY_AR}ية — صُمّمت من الصفر لتلبية احتياجات السوق المحلي. نربط الشركات، رواد الأعمال، والأفراد بمستقلين ليبيين في البرمجة والتصميم والتسويق والكتابة وغيرها.`,
    missionHeading: 'رسالتنا',
    missionBody: PLATFORM_MISSION_AR,
    whyLibyanHeading: 'لماذا منصة ليبية؟',
    whyLibyanBody: `السوق الليبي له خصوصيته: العملة (${PLATFORM_CURRENCY_AR} — ${PLATFORM_CURRENCY_CODE})، المدن، اللغة، وطبيعة التعامل. لذلك بنينا ${PLATFORM_NAME_AR} ليكون البديل المحلي الموثوق — ليس منصة عامة مُكيَّفة، بل سوق عمل حر يفهم ليبيا.`,
    citiesHeading: 'المدن التي نخدمها',
    citiesBody: `مستقلون ومشاريع في ${LIBYAN_CITIES_HIGHLIGHT_AR}. يمكنك البحث حسب المدينة أو العمل عن بُعد مع مواهب من أي مكان في ليبيا.`,
    visionHeading: 'رؤيتنا',
    visionBody:
      'أن يصبح العمل الحر في ليبيا مهنة محترمة ومستدامة — حيث يجد المستقل فرصاً عادلة بالدينار الليبي، ويجد صاحب المشروع موهبة محلية يثق بها دون الحاجة للبحث خارج البلاد.',
    valuesHeading: 'قيمنا',
    values: [
      { title: 'محلية أولاً:', body: 'مواهب ومشاريع من ليبيا، لليبيا.' },
      {
        title: 'شفافية:',
        body: `ميزانيات وعروض واضحة بالدينار الليبي (${PLATFORM_CURRENCY_CODE}).`,
      },
      { title: 'ثقة:', body: 'ملفات موثّقة، تقييمات حقيقية، ومجتمع مسؤول.' },
      { title: 'سهولة:', body: 'تصفح بدون حساب، وتسجيل فقط عند الحاجة.' },
    ],
    offeringsHeading: 'ما نقدّمه اليوم',
    offerings: [
      'نشر المشاريع واستقبال العروض بالدينار الليبي',
      'ملفات مستقلين ليبيين مع معرض أعمال وتقييمات',
      'مراسلة مدمجة وإشعارات فورية',
      'صفحات مخصصة لكل مدينة وتصنيف مهني',
    ],
  },
  contact: {
    title: 'اتصل بنا',
    subtitle: `فريق ${PLATFORM_NAME_AR}`,
    intro: 'للاستفسارات والدعم والشراكات:',
    emailLabel: 'البريد:',
    marketLabel: 'السوق:',
    marketValue: 'ليبيا 🇱🇾',
    currencyLabel: 'العملة:',
    currencyValue: 'الدينار الليبي (د.ل)',
    formNote: 'سيتم تفعيل نموذج التواصل المباشر قريباً.',
  },
  help: {
    metaTitle: 'مركز المساعدة',
    metaDescription: `أسئلة شائعة حول ${PLATFORM_NAME_AR} — التسجيل، نشر المشاريع، العروض، التقييمات، والدينار الليبي.`,
    title: 'مركز المساعدة',
    subtitle: 'أسئلة شائعة وروابط مفيدة',
    sections: [
      {
        title: 'البداية',
        items: [
          {
            q: `ما هي ${PLATFORM_NAME_AR}؟`,
            a: 'سوق عمل حر ليبي يربط العملاء (شركات وأفراد) بالمستقلين المحليين في التطوير والتصميم والتسويق والكتابة وغيرها. الميزانيات بالدينار الليبي.',
          },
          {
            q: 'هل أحتاج حساباً للتصفح؟',
            a: 'لا. يمكنك تصفح المشاريع والمستقلين بحرية. الحساب مطلوب فقط عند نشر مشروع أو تقديم عرض.',
          },
          {
            q: 'ما العملة المستخدمة؟',
            a: 'الدينار الليبي (د.ل / LYD) في جميع الميزانيات والعروض.',
          },
        ],
      },
      {
        title: 'للعملاء',
        items: [
          {
            q: 'كيف أنشر مشروعاً؟',
            a: 'من الصفحة الرئيسية استخدم نموذج «انشر مشروع» أو سجّل كعميل وانتقل إلى لوحة التحكم → مشروع جديد. يمكنك أيضاً استخدام مساعد الإعلان لتحضير مسودة.',
          },
          {
            q: 'كم يستغرق استقبال العروض؟',
            a: 'يعتمد على نوع المشروع والميزانية. المشاريع الواضحة والميزانية المناسبة تجذب عروضاً أسرع.',
          },
          {
            q: 'كيف أختار المستقل المناسب؟',
            a: 'قارن العروض، راجع ملف المستقل وتقييماته ومشاريعه المكتملة، وتواصل معه قبل القبول.',
          },
        ],
      },
      {
        title: 'للمستقلين',
        items: [
          {
            q: 'ما هو نظام نقاطي؟',
            a: 'نقاطي هي عملة المنصة للمستقلين. تكسب نقاطاً بالنشاط (تسجيل دخول، إكمال الملف، معرض الأعمال) وتُنفقها عند تقديم العروض. يمكنك أيضاً شراء نقاط بالدينار الليبي من لوحة نقاطي.',
          },
          {
            q: 'كيف أحصل على مشاريع؟',
            a: 'أكمل ملفك (صورة، نبذة، مهارات، معرض أعمال)، تصفّح المشاريع المفتوحة، وقدّم عروضاً مخصصة.',
          },
          {
            q: 'ما معنى «مستقل موثّق»؟',
            a: `شارة تُمنح عند: ${VERIFICATION_CRITERIA_AR.join('، ')}.`,
          },
          {
            q: 'هل يمكنني العمل عن بُعد؟',
            a: 'نعم. المنصة تدعم حالياً تقديم الخدمات عن بُعد. طرق التقديم الحضوري والهجين مخططة لإصدارات لاحقة.',
          },
        ],
      },
      {
        title: 'الأمان والمدفوعات',
        items: [
          {
            q: 'هل يوجد نظام ضمان أو حماية للمدفوعات؟',
            a: 'نظام حماية المدفوعات — قريبًا. نعمل حاليًا على استكمال الربط مع مزودي الدفع الإلكتروني في ليبيا، لإطلاق نظام حماية مدفوعات يرفع مستوى الأمان والثقة بين العميل والمستقل. الميزة غير مفعّلة حاليًا.',
          },
          {
            q: 'كيف أبلّغ عن مشكلة؟',
            a: 'تواصل معنا عبر صفحة اتصل بنا مع تفاصيل المشكلة. نراجع البلاغات ونتخذ الإجراء المناسب.',
          },
        ],
      },
    ],
    quickLinksHeading: 'روابط سريعة',
    quickLinks: [
      { href: '/how-it-works', label: 'كيف تعمل المنصة — دليل مفصّل' },
      { href: '/escrow', label: 'حماية المدفوعات قريبًا' },
      { href: '/privacy', label: 'سياسة الخصوصية' },
      { href: '/terms', label: 'شروط الخدمة' },
      { href: '/contact', label: 'اتصل بنا' },
    ],
  },
  howItWorks: {
    metaTitle: 'كيف تعمل المنصة',
    metaDescription: `دليل استخدام ${PLATFORM_NAME_AR} في ليبيا — للعملاء والمستقلين: نشر المشاريع، العروض، والتقييم — كل شيء بالدينار الليبي.`,
    title: 'كيف تعمل المنصة',
    subtitle: `دليل ${PLATFORM_NAME_AR} — سوق العمل الحر الليبي للعملاء والمستقلين`,
    intro: `${PLATFORM_NAME_AR} يجمع بين أصحاب المشاريع والمواهب الليبية في مكان واحد. سواء كنت في طرابلس أو بنغازي أو تعمل عن بُعد — الخطوات التالية توضّح كيف تستفيد من المنصة بالدينار الليبي (${PLATFORM_CURRENCY_CODE}).`,
    clientHeading: 'للعملاء — من الفكرة إلى الإنجاز في ليبيا',
    clientSteps: [
      {
        title: 'تصفّح بحرية',
        body: `استكشف المشاريع والمستقلين في ${LIBYAN_CITIES_HIGHLIGHT_AR} — بدون إنشاء حساب. ابحث حسب المدينة أو المهارة أو الميزانية بالدينار الليبي.`,
      },
      {
        title: 'انشر مشروعك',
        body: 'أنشئ حساب عميل عند الحاجة. صِف مشروعك وحدّد ميزانيتك بـد.ل، أو استخدم مساعد الإعلان من الصفحة الرئيسية.',
      },
      {
        title: 'استقبل العروض',
        body: 'يقدّم المستقلون الليبيون عروضاً تتضمن السعر والمدة بالدينار. قارن الخبرة والتقييمات واختر الأنسب لمشروعك.',
      },
      {
        title: 'تواصل وأنجز',
        body: 'تواصل مع المستقل عبر الرسائل داخل المنصة. تابع التقدم حتى إتمام المشروع — محلياً أو عن بُعد.',
      },
      {
        title: 'قيّم التجربة',
        body: 'بعد الإتمام، اترك تقييماً صادقاً. تقييمك يبني مجتمع عمل حر ليبي أكثر شفافية وموثوقية.',
      },
    ],
    freelancerHeading: 'للمستقلين — من الملف إلى مشاريع ليبية',
    freelancerSteps: [
      {
        title: 'أنشئ ملفاً ليبياً قوياً',
        body: 'أضف صورتك، نبذة مهنية، مدينتك، مهاراتك، ومعرض أعمالك. الملف الكامل يزيد ظهورك أمام العملاء المحليين.',
      },
      {
        title: 'تصفّح مشاريع ليبيا',
        body: `ابحث عن فرص في مدينتك أو عن بُعد — ${LIBYAN_CITIES_HIGHLIGHT_AR}. فلتر حسب التصنيف والميزانية.`,
      },
      {
        title: 'قدّم عروضاً بالدينار',
        body: `اشرح خبرتك وقدّم سعراً ومدة واقعيين بـ${PLATFORM_CURRENCY_CODE}. العملاء الليبيون يفضّلون الوضوح في العملة.`,
      },
      {
        title: 'نفّذ باحترافية',
        body: 'تواصل مع العميل، سلّم العمل في الوقت المتفق عليه، وابنِ سمعتك في السوق الليبي.',
      },
      {
        title: 'احصل على شارة «موثّق»',
        body: 'أكمل ملفك، أنجز مشروعاً واحداً على الأقل، واحصل على تقييم 4 نجوم فأعلى — شارة تُميّزك بين المستقلين.',
      },
    ],
    verifiedHeading: 'شارة «مستقل موثّق»',
    verifiedIntro: 'تُمنح تلقائياً للمستقلين الليبيين الذين يستوفون المعايير التالية:',
    verificationCriteria: [...VERIFICATION_CRITERIA_AR],
    currencyHeading: 'العملة والمدفوعات',
    currencyBeforeLink: `جميع الميزانيات والعروض بالدينار الليبي (${PLATFORM_CURRENCY_CODE}). نظام حماية المدفوعات الإلكتروني قيد التجهيز وسيكون متاحًا قريبًا — راجع `,
    currencyLinkLabel: 'صفحة حماية المدفوعات',
    currencyAfterLink: '.',
  },
  escrow: {
    title: 'نظام حماية المدفوعات — قريبًا',
    subtitle: 'نعمل على تجهيز نظام دفع وحماية معاملات متكامل داخل المنصة',
    intro: `نعمل حاليًا على استكمال الربط مع مزودي الدفع الإلكتروني في ليبيا، لإطلاق نظام حماية مدفوعات يرفع مستوى الأمان والثقة بين العميل والمستقل على ${PLATFORM_NAME_AR}. هذه الميزة غير مفعّلة بعد.`,
    howHeading: 'ما الذي نجهّزه؟',
    howSteps: [
      `عند الإطلاق: تمويل آمن لمبلغ العرض بالدينار الليبي (${PLATFORM_CURRENCY_CODE}) عبر مزوّدي دفع محليين`,
      'حجز الأموال داخل المنصة أثناء تنفيذ المشروع حتى موافقة العميل',
      `تحرير المستحقات للمستقل بعد التأكيد (مع عمولة المنصة ${ESCROW_PLATFORM_FEE_PERCENT}%)`,
      'آلية نزاع عادلة عند الاختلاف — بمراجعة فريق الإدارة',
    ],
    forClientsHeading: 'للعملاء',
    forClientsItems: [
      'حماية المدفوعات قريبًا — لن تحتاج للدفع المباشر دون حماية داخل المنصة',
      'عند الإطلاق ستتمكن من فتح نزاع إذا لم يُنفَّذ العمل كما اتُفق',
    ],
    forFreelancersHeading: 'للمستقلين',
    forFreelancersItems: [
      'عند الإطلاق: اطمئن أن المبلغ محمي قبل بدء العمل الجاد',
      'تحرير المستحقات بعد تأكيد العميل — ضمن نظام الحماية القادم',
    ],
    mvpNote: `حماية المدفوعات قريبًا. نعمل على تجهيز نظام دفع وحماية معاملات متكامل داخل المنصة. جميع الميزانيات المعروضة حاليًا بالدينار الليبي (${PLATFORM_CURRENCY_CODE}).`,
  },
  privacy: {
    metaTitle: 'سياسة الخصوصية',
    metaDescription: `كيف تجمع ${PLATFORM_NAME_AR} وتستخدم وتحمي بياناتك الشخصية على منصة العمل الحر في ليبيا.`,
    title: 'سياسة الخصوصية',
    lastUpdated: 'آخر تحديث: سبتمبر 2026',
    intro: `تحترم ${PLATFORM_NAME_AR} («نحن»، «المنصة») خصوصيتك. توضّح هذه السياسة كيف نجمع ونستخدم ونحمي معلوماتك عند استخدام موقعنا وخدماتنا في ليبيا.`,
    sections: [
      {
        heading: '1. البيانات التي نجمعها',
        items: [
          {
            title: 'بيانات الحساب:',
            body: 'الاسم، البريد الإلكتروني، كلمة المرور (مشفّرة)، الدور (عميل/مستقل)، وحالة التحقق من البريد.',
          },
          {
            title: 'الملف الشخصي:',
            body: 'الصورة، النبذة، المدينة، المهارات، المسمى المهني، معرض الأعمال، والسعر بالساعة.',
          },
          {
            title: 'محتوى المنصة:',
            body: 'المشاريع، العروض، الرسائل، التقييمات، والإشعارات.',
          },
          {
            title: 'بيانات تقنية:',
            body: 'عنوان IP، نوع المتصفح، سجلات الأمان، وملفات الجلسة (cookies) اللازمة لتسجيل الدخول.',
          },
        ],
      },
      {
        heading: '2. كيف نستخدم بياناتك',
        items: [
          { title: '', body: 'تشغيل المنصة وربط العملاء بالمستقلين' },
          { title: '', body: 'التواصل عبر الرسائل والإشعارات' },
          { title: '', body: 'الأمان ومنع الاحتيال وإساءة الاستخدام' },
          { title: '', body: 'تحسين الخدمة ودعم المستخدمين' },
          { title: '', body: 'الامتثال للقوانين المعمول بها' },
        ],
      },
      {
        heading: '3. مشاركة البيانات',
        paragraphs: [
          'لا نبيع بياناتك الشخصية. قد نشارك بيانات محدودة مع مزودي البنية التحتية (الاستضافة، البريد الإلكتروني) بموجب عقود سرية. الملفات العامة للمستقلين مرئية للزوار كجزء من طبيعة المنصة.',
        ],
      },
      {
        heading: '4. الاحتفاظ بالبيانات',
        beforeContactLink: 'نحتفظ ببياناتك طالما حسابك نشط أو حسب الحاجة لتقديم الخدمة والامتثال القانوني. يمكنك طلب حذف الحساب عبر ',
        contactLinkLabel: 'اتصل بنا',
        afterContactLink: '.',
      },
      {
        heading: '5. حقوقك',
        items: [
          { title: '', body: 'الوصول إلى بياناتك وتحديث ملفك الشخصي' },
          { title: '', body: 'طلب تصحيح أو حذف بياناتك (مع مراعاة الالتزامات القانونية)' },
          { title: '', body: 'الاعتراض على معالجة معيّنة حيث يسمح القانون بذلك' },
        ],
      },
      {
        heading: '6. الأمان',
        paragraphs: [
          'نطبّق إجراءات أمنية معقولة لحماية بياناتك، بما في ذلك تشفير كلمات المرور واتصالات HTTPS. لا يمكن ضمان أمان مطلق على الإنترنت.',
        ],
      },
      {
        heading: '7. ملفات تعريف الارتباط (Cookies)',
        paragraphs: [
          'نستخدم cookies ضرورية للجلسة والمصادقة. يمكنك ضبط متصفحك لرفض cookies غير الضرورية، لكن قد لا تعمل بعض الميزات.',
        ],
      },
      {
        heading: '8. التعديلات',
        paragraphs: ['قد نحدّث هذه السياسة. سننشر النسخة المحدّثة على هذه الصفحة مع تاريخ التعديل.'],
      },
      {
        heading: '9. التواصل',
        beforeContactLink: 'لأي استفسار حول الخصوصية: ',
        contactLinkLabel: 'صفحة اتصل بنا',
        afterContactLink: '.',
      },
    ],
  },
  terms: {
    metaTitle: 'شروط الخدمة',
    metaDescription: `شروط استخدام منصة ${PLATFORM_NAME_AR} — الحسابات، المشاريع، العروض، المدفوعات، والمسؤوليات.`,
    title: 'شروط الخدمة',
    lastUpdated: 'آخر تحديث: سبتمبر 2026',
    intro: `باستخدامك ${PLATFORM_NAME_AR} («المنصة») فإنك توافق على هذه الشروط. إذا لم توافق، يرجى عدم استخدام الخدمة.`,
    sections: [
      {
        heading: '1. التعريفات',
        items: [
          { title: 'العميل:', body: 'من ينشر مشاريع ويبحث عن مستقلين.' },
          { title: 'المستقل:', body: 'من يقدّم خدماته وعروضه عبر المنصة.' },
          { title: 'المشروع:', body: 'طلب عمل منشور على المنصة.' },
        ],
      },
      {
        heading: '2. الحسابات والأهلية',
        paragraphs: [
          'يجب أن تكون بالغاً قانونياً وأن تقدّم معلومات صحيحة. أنت مسؤول عن أمان حسابك وعن جميع الأنشطة التي تتم من خلاله. يُحظر انتحال الهوية أو إنشاء حسابات وهمية.',
        ],
      },
      {
        heading: '3. استخدام المنصة',
        items: [
          { title: '', body: 'الالتزام بالقوانين الليبية والمعمول بها' },
          { title: '', body: 'عدم نشر محتوى غير قانوني أو مسيء أو مخادع' },
          { title: '', body: 'عدم التحايل على المنصة أو إرسال رسائل غير مرغوب فيها' },
          { title: '', body: 'احترام حقوق الملكية الفكرية للآخرين' },
        ],
      },
      {
        heading: '4. المشاريع والعروض',
        paragraphs: [
          'العملاء مسؤولون عن وصف المشاريع بدقة وتحديد ميزانيات واقعية بالدينار الليبي. المستقلون مسؤولون عن دقة عروضهم وجودة التنفيذ المتفق عليه. الاتفاق النهائي بين الطرفين يشمل السعر والمدة والنطاق — والمنصة وسيط للتواصل وليست طرفاً في العقد المباشر بين العميل والمستقل إلا حيث يُذكر صراحةً.',
        ],
      },
      {
        heading: '5. المدفوعات والضمان',
        beforeEscrowLink:
          'الميزانيات تُعرض بالدينار الليبي (د.ل). نظام حماية المدفوعات الإلكتروني غير مفعّل حاليًا ونعمل على إطلاقه قريبًا بالتعاون مع مزودي الدفع في ليبيا. عند التفعيل، ستُحمى أموال المشروع داخل المنصة حتى تأكيد الإتمام، مع خصم عمولة المنصة (10%)، وآلية نزاع عند الحاجة. راجع ',
        escrowLinkLabel: 'صفحة حماية المدفوعات',
        afterEscrowLink:
          ' للتفاصيل والتحديثات. حتى إطلاق البوابة، لا تُحجز أموال حقيقية داخل المنصة.',
      },
      {
        heading: '6. التقييمات والمحتوى',
        paragraphs: [
          'التقييمات يجب أن تكون صادقة ومبنية على تجربة فعلية. نحتفظ بحق إخفاء أو إزالة تقييمات مخالفة. المحتوى الذي تنشره تمنحنا ترخيصاً غير حصري لعرضه ضمن الخدمة.',
        ],
      },
      {
        heading: '7. إنهاء الحساب',
        paragraphs: [
          'يمكنك إغلاق حسابك عبر التواصل مع الدعم. يحق للإدارة تعليق أو إنهاء حسابات تخالف هذه الشروط أو سياسات المنصة دون إشعار مسبق في حالات جسيمة.',
        ],
      },
      {
        heading: '8. إخلاء المسؤولية',
        paragraphs: [
          'تُقدَّم المنصة «كما هي». لا نضمن نتائج مشاريع معيّنة ولا نتحمل مسؤولية النزاعات بين المستخدمين إلا بالقدر الذي تفرضه القوانين المعمول بها.',
        ],
      },
      {
        heading: '9. التعديلات',
        paragraphs: ['قد نعدّل هذه الشروط. استمرارك في الاستخدام بعد النشر يُعد موافقة على التعديلات.'],
      },
      {
        heading: '10. التواصل',
        beforeContactLink: 'للاستفسارات القانونية: ',
        contactLinkLabel: 'اتصل بنا',
        afterContactLink: '. راجع أيضاً ',
        beforePrivacyLink: '',
        privacyLinkLabel: 'سياسة الخصوصية',
        afterPrivacyLink: '.',
      },
    ],
  },
  sitemap: {
    title: 'خريطة الموقع',
    sections: [
      {
        title: 'المنصة',
        links: [
          { href: '/', label: 'الرئيسية' },
          { href: '/projects', label: 'المشاريع' },
          { href: '/freelancers', label: 'المستقلون' },
          { href: '/search', label: 'بحث' },
        ],
      },
      {
        title: 'معلومات',
        links: [
          { href: '/how-it-works', label: 'كيف تعمل' },
          { href: '/help', label: 'مركز المساعدة' },
          { href: '/escrow', label: 'حماية المدفوعات قريبًا' },
          { href: '/about', label: 'من نحن' },
          { href: '/contact', label: 'اتصل بنا' },
          { href: '/privacy', label: 'الخصوصية' },
          { href: '/terms', label: 'الشروط' },
        ],
      },
      {
        title: 'مدن ليبيا',
        links: [],
      },
      {
        title: 'التصنيفات',
        links: [],
      },
    ],
  },
};

const EN_CITIES_HIGHLIGHT = 'Tripoli · Benghazi · Misrata · Zawiya · Sebha · Remote';

const EN_CONTENT: MarketingPagesContent = {
  about: {
    metaTitle: `About — ${PLATFORM_NAME_EN}`,
    metaDescription: `${PLATFORM_NAME_EN} — Libya's freelance marketplace. A Libyan platform connecting project owners with local talent in Tripoli, Benghazi, and Misrata — in Libyan Dinar.`,
    title: `About — ${PLATFORM_NAME_EN}`,
    subtitle: "Libya's Freelance Marketplace",
    intro: `${PLATFORM_FLAG} ${PLATFORM_NAME_EN} is a Libyan freelance marketplace — built from the ground up for the local market. We connect businesses, entrepreneurs, and individuals with Libyan freelancers in programming, design, marketing, writing, and more.`,
    missionHeading: 'Our mission',
    missionBody:
      'Empowering Libyan talent to freelance professionally, building a trusted bridge between businesses and individuals across Libya.',
    whyLibyanHeading: 'Why a Libyan platform?',
    whyLibyanBody: `The Libyan market has its own character: currency (Libyan Dinar — LYD), cities, language, and ways of doing business. That's why we built ${PLATFORM_NAME_EN} as a trusted local alternative — not a generic platform adapted for Libya, but a freelance marketplace that understands Libya.`,
    citiesHeading: 'Cities we serve',
    citiesBody: `Freelancers and projects across ${EN_CITIES_HIGHLIGHT}. Search by city or work remotely with talent from anywhere in Libya.`,
    visionHeading: 'Our vision',
    visionBody:
      'For freelancing in Libya to become a respected, sustainable profession — where freelancers find fair opportunities in Libyan Dinar, and project owners find local talent they trust without looking abroad.',
    valuesHeading: 'Our values',
    values: [
      { title: 'Local first:', body: 'Libyan talent and projects, for Libya.' },
      { title: 'Transparency:', body: 'Clear budgets and proposals in Libyan Dinar (LYD).' },
      { title: 'Trust:', body: 'Verified profiles, genuine reviews, and a responsible community.' },
      { title: 'Simplicity:', body: 'Browse without an account; register only when you need to.' },
    ],
    offeringsHeading: 'What we offer today',
    offerings: [
      'Post projects and receive proposals in Libyan Dinar',
      'Libyan freelancer profiles with portfolios and reviews',
      'Built-in messaging and instant notifications',
      'Dedicated pages for each city and professional category',
    ],
  },
  contact: {
    title: 'Contact us',
    subtitle: `${PLATFORM_NAME_EN} team`,
    intro: 'For inquiries, support, and partnerships:',
    emailLabel: 'Email:',
    marketLabel: 'Market:',
    marketValue: 'Libya 🇱🇾',
    currencyLabel: 'Currency:',
    currencyValue: 'Libyan Dinar (LYD)',
    formNote: 'A direct contact form will be available soon.',
  },
  help: {
    metaTitle: 'Help center',
    metaDescription: `Frequently asked questions about ${PLATFORM_NAME_EN} — registration, posting projects, proposals, reviews, and Libyan Dinar.`,
    title: 'Help center',
    subtitle: 'FAQs and useful links',
    sections: [
      {
        title: 'Getting started',
        items: [
          {
            q: `What is ${PLATFORM_NAME_EN}?`,
            a: 'A Libyan freelance marketplace connecting clients (businesses and individuals) with local freelancers in development, design, marketing, writing, and more. Budgets are in Libyan Dinar.',
          },
          {
            q: 'Do I need an account to browse?',
            a: 'No. You can browse projects and freelancers freely. An account is only required when posting a project or submitting a proposal.',
          },
          {
            q: 'What currency is used?',
            a: 'Libyan Dinar (LYD) for all budgets and proposals.',
          },
        ],
      },
      {
        title: 'For clients',
        items: [
          {
            q: 'How do I post a project?',
            a: 'From the homepage use the "Post a project" form, or register as a client and go to Dashboard → New project. You can also use the listing assistant to draft a post.',
          },
          {
            q: 'How long until I receive proposals?',
            a: 'It depends on the project type and budget. Clear projects with appropriate budgets attract proposals faster.',
          },
          {
            q: 'How do I choose the right freelancer?',
            a: 'Compare proposals, review the freelancer profile, ratings, and completed work, and message them before accepting.',
          },
        ],
      },
      {
        title: 'For freelancers',
        items: [
          {
            q: 'What is Nuqati?',
            a: 'Nuqati is the platform currency for freelancers. Earn points through activity (login, completing your profile, portfolio) and spend them when submitting proposals. You can also buy points in Libyan Dinar from the Nuqati dashboard.',
          },
          {
            q: 'How do I get projects?',
            a: 'Complete your profile (photo, bio, skills, portfolio), browse open projects, and submit tailored proposals.',
          },
          {
            q: 'What does "verified freelancer" mean?',
            a: `A badge granted when you meet: ${VERIFICATION_CRITERIA_EN.join(', ')}.`,
          },
          {
            q: 'Can I work remotely?',
            a: 'Yes. The platform currently supports remote service delivery only. On-site and hybrid modes are planned for later releases.',
          },
        ],
      },
      {
        title: 'Safety and payments',
        items: [
          {
            q: 'Is there an escrow or payment protection system?',
            a: 'Payment Protection — Coming Soon. We are currently working on integrating electronic payment providers in Libya to introduce a secure payment protection system for clients and freelancers. This feature is not live yet.',
          },
          {
            q: 'How do I report a problem?',
            a: 'Contact us via the contact page with details. We review reports and take appropriate action.',
          },
        ],
      },
    ],
    quickLinksHeading: 'Quick links',
    quickLinks: [
      { href: '/how-it-works', label: 'How it works — detailed guide' },
      { href: '/escrow', label: 'Payment protection — coming soon' },
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
      { href: '/contact', label: 'Contact us' },
    ],
  },
  howItWorks: {
    metaTitle: 'How it works',
    metaDescription: `Guide to using ${PLATFORM_NAME_EN} in Libya — for clients and freelancers: posting projects, proposals, and reviews — all in Libyan Dinar.`,
    title: 'How it works',
    subtitle: `${PLATFORM_NAME_EN} guide — Libya's freelance marketplace for clients and freelancers`,
    intro: `${PLATFORM_NAME_EN} brings project owners and Libyan talent together in one place. Whether you're in Tripoli, Benghazi, or working remotely — the steps below show how to use the platform in Libyan Dinar (LYD).`,
    clientHeading: 'For clients — from idea to delivery in Libya',
    clientSteps: [
      {
        title: 'Browse freely',
        body: `Explore projects and freelancers across ${EN_CITIES_HIGHLIGHT} — no account required. Search by city, skill, or budget in Libyan Dinar.`,
      },
      {
        title: 'Post your project',
        body: 'Create a client account when needed. Describe your project and set your budget in LYD, or use the listing assistant from the homepage.',
      },
      {
        title: 'Receive proposals',
        body: 'Libyan freelancers submit proposals with price and timeline in LYD. Compare experience, ratings, and choose the best fit.',
      },
      {
        title: 'Communicate and deliver',
        body: 'Message the freelancer on the platform. Track progress until completion — locally or remotely.',
      },
      {
        title: 'Rate the experience',
        body: 'After completion, leave an honest review. Your rating helps build a more transparent, trusted Libyan freelance community.',
      },
    ],
    freelancerHeading: 'For freelancers — from profile to Libyan projects',
    freelancerSteps: [
      {
        title: 'Build a strong Libyan profile',
        body: 'Add your photo, professional bio, city, skills, and portfolio. A complete profile increases visibility with local clients.',
      },
      {
        title: 'Browse projects in Libya',
        body: `Find opportunities in your city or remotely — ${EN_CITIES_HIGHLIGHT}. Filter by category and budget.`,
      },
      {
        title: 'Submit proposals in LYD',
        body: 'Explain your experience and offer realistic price and timeline in LYD. Libyan clients prefer clarity in currency.',
      },
      {
        title: 'Deliver professionally',
        body: 'Communicate with the client, deliver on time, and build your reputation in the Libyan market.',
      },
      {
        title: 'Earn the verified badge',
        body: 'Complete your profile, finish at least one project, and earn a 4-star rating or higher — a badge that sets you apart.',
      },
    ],
    verifiedHeading: 'Verified freelancer badge',
    verifiedIntro: 'Granted automatically to Libyan freelancers who meet the following criteria:',
    verificationCriteria: [...VERIFICATION_CRITERIA_EN],
    currencyHeading: 'Currency and payments',
    currencyBeforeLink:
      'All budgets and proposals are in Libyan Dinar (LYD). Electronic payment protection is being prepared and will be available soon — see the ',
    currencyLinkLabel: 'payment protection page',
    currencyAfterLink: '.',
  },
  escrow: {
    title: 'Payment Protection — Coming Soon',
    subtitle: 'We are preparing an integrated payment and transaction-protection system inside the platform',
    intro: `We are currently working on integrating electronic payment providers in Libya to introduce a secure payment protection system for clients and freelancers on ${PLATFORM_NAME_EN}. This feature is not enabled yet.`,
    howHeading: 'What we are building',
    howSteps: [
      'At launch: secure funding of the proposal amount (LYD) via local payment providers',
      'Holding project funds on the platform while work is in progress until client approval',
      `Releasing payment to the freelancer after confirmation (after a ${ESCROW_PLATFORM_FEE_PERCENT}% platform fee)`,
      'A fair dispute process when parties disagree — reviewed by the admin team',
    ],
    forClientsHeading: 'For clients',
    forClientsItems: [
      'Payment protection coming soon — you will not need to pay unprotected outside the platform',
      'Once live, you will be able to open a dispute if work is not delivered as agreed',
    ],
    forFreelancersHeading: 'For freelancers',
    forFreelancersItems: [
      'At launch: confidence that funds are protected before serious work begins',
      'Payment released after client confirmation — within the upcoming protection system',
    ],
    mvpNote:
      'Payment protection coming soon. We are preparing an integrated payment and transaction-protection system inside the platform. All budgets shown today are in Libyan Dinar (LYD).',
  },
  privacy: {
    metaTitle: 'Privacy policy',
    metaDescription: `How ${PLATFORM_NAME_EN} collects, uses, and protects your personal data on the Libyan freelance marketplace.`,
    title: 'Privacy policy',
    lastUpdated: 'Last updated: September 2026',
    intro: `${PLATFORM_NAME_EN} ("we", "the platform") respects your privacy. This policy explains how we collect, use, and protect your information when you use our site and services in Libya.`,
    sections: [
      {
        heading: '1. Data we collect',
        items: [
          {
            title: 'Account data:',
            body: 'Name, email, password (encrypted), role (client/freelancer), and email verification status.',
          },
          {
            title: 'Profile:',
            body: 'Photo, bio, city, skills, professional title, portfolio, and hourly rate.',
          },
          {
            title: 'Platform content:',
            body: 'Projects, proposals, messages, reviews, and notifications.',
          },
          {
            title: 'Technical data:',
            body: 'IP address, browser type, security logs, and session cookies required for login.',
          },
        ],
      },
      {
        heading: '2. How we use your data',
        items: [
          { title: '', body: 'Operating the platform and connecting clients with freelancers' },
          { title: '', body: 'Communication via messages and notifications' },
          { title: '', body: 'Security, fraud prevention, and abuse prevention' },
          { title: '', body: 'Improving the service and user support' },
          { title: '', body: 'Compliance with applicable laws' },
        ],
      },
      {
        heading: '3. Data sharing',
        paragraphs: [
          'We do not sell your personal data. We may share limited data with infrastructure providers (hosting, email) under confidentiality agreements. Public freelancer profiles are visible to visitors as part of the platform.',
        ],
      },
      {
        heading: '4. Data retention',
        beforeContactLink:
          'We retain your data while your account is active or as needed to provide the service and meet legal obligations. You may request account deletion via ',
        contactLinkLabel: 'contact us',
        afterContactLink: '.',
      },
      {
        heading: '5. Your rights',
        items: [
          { title: '', body: 'Access and update your profile data' },
          { title: '', body: 'Request correction or deletion of your data (subject to legal obligations)' },
          { title: '', body: 'Object to certain processing where permitted by law' },
        ],
      },
      {
        heading: '6. Security',
        paragraphs: [
          'We apply reasonable security measures to protect your data, including password encryption and HTTPS. Absolute security on the internet cannot be guaranteed.',
        ],
      },
      {
        heading: '7. Cookies',
        paragraphs: [
          'We use cookies essential for session and authentication. You can configure your browser to reject non-essential cookies, but some features may not work.',
        ],
      },
      {
        heading: '8. Changes',
        paragraphs: ['We may update this policy. We will publish the updated version on this page with the revision date.'],
      },
      {
        heading: '9. Contact',
        beforeContactLink: 'For privacy inquiries: ',
        contactLinkLabel: 'contact page',
        afterContactLink: '.',
      },
    ],
  },
  terms: {
    metaTitle: 'Terms of service',
    metaDescription: `Terms of use for ${PLATFORM_NAME_EN} — accounts, projects, proposals, payments, and responsibilities.`,
    title: 'Terms of service',
    lastUpdated: 'Last updated: September 2026',
    intro: `By using ${PLATFORM_NAME_EN} ("the platform"), you agree to these terms. If you do not agree, please do not use the service.`,
    sections: [
      {
        heading: '1. Definitions',
        items: [
          { title: 'Client:', body: 'Someone who posts projects and seeks freelancers.' },
          { title: 'Freelancer:', body: 'Someone who offers services and proposals on the platform.' },
          { title: 'Project:', body: 'A work request published on the platform.' },
        ],
      },
      {
        heading: '2. Accounts and eligibility',
        paragraphs: [
          'You must be of legal age and provide accurate information. You are responsible for your account security and all activity through it. Impersonation and fake accounts are prohibited.',
        ],
      },
      {
        heading: '3. Use of the platform',
        items: [
          { title: '', body: 'Comply with Libyan and applicable laws' },
          { title: '', body: 'Do not post illegal, offensive, or misleading content' },
          { title: '', body: 'Do not circumvent the platform or send spam' },
          { title: '', body: "Respect others' intellectual property rights" },
        ],
      },
      {
        heading: '4. Projects and proposals',
        paragraphs: [
          'Clients are responsible for accurate project descriptions and realistic budgets in Libyan Dinar. Freelancers are responsible for accurate proposals and agreed quality. The final agreement between parties includes price, timeline, and scope — the platform facilitates communication and is not a direct party to the contract between client and freelancer unless explicitly stated.',
        ],
      },
      {
        heading: '5. Payments and escrow',
        beforeEscrowLink:
          'Budgets are shown in Libyan Dinar (LYD). Electronic payment protection is not live yet — we are preparing a launch with payment providers in Libya. Once enabled, project funds will be protected on the platform until completion confirmation, minus a 10% platform fee, with a dispute process when needed. See the ',
        escrowLinkLabel: 'payment protection page',
        afterEscrowLink:
          ' for details and updates. Until the gateway launches, no real funds are held on the platform.',
      },
      {
        heading: '6. Reviews and content',
        paragraphs: [
          'Reviews must be honest and based on actual experience. We reserve the right to hide or remove violating reviews. Content you post grants us a non-exclusive license to display it within the service.',
        ],
      },
      {
        heading: '7. Account termination',
        paragraphs: [
          'You may close your account by contacting support. We may suspend or terminate accounts that violate these terms or platform policies without prior notice in serious cases.',
        ],
      },
      {
        heading: '8. Disclaimer',
        paragraphs: [
          'The platform is provided "as is". We do not guarantee specific project outcomes and are not liable for disputes between users except as required by applicable law.',
        ],
      },
      {
        heading: '9. Changes',
        paragraphs: ['We may amend these terms. Continued use after publication constitutes acceptance of the changes.'],
      },
      {
        heading: '10. Contact',
        beforeContactLink: 'For legal inquiries: ',
        contactLinkLabel: 'contact us',
        afterContactLink: '. See also ',
        beforePrivacyLink: '',
        privacyLinkLabel: 'privacy policy',
        afterPrivacyLink: '.',
      },
    ],
  },
  sitemap: {
    title: 'Sitemap',
    sections: [
      {
        title: 'Platform',
        links: [
          { href: '/', label: 'Home' },
          { href: '/projects', label: 'Projects' },
          { href: '/freelancers', label: 'Freelancers' },
          { href: '/search', label: 'Search' },
        ],
      },
      {
        title: 'Information',
        links: [
          { href: '/how-it-works', label: 'How it works' },
          { href: '/help', label: 'Help center' },
          { href: '/escrow', label: 'Payment protection — coming soon' },
          { href: '/about', label: 'About' },
          { href: '/contact', label: 'Contact' },
          { href: '/privacy', label: 'Privacy' },
          { href: '/terms', label: 'Terms' },
        ],
      },
      {
        title: 'Libyan cities',
        links: [],
      },
      {
        title: 'Categories',
        links: [],
      },
    ],
  },
};

export function getMarketingPageContent(locale: AppLocale): MarketingPagesContent {
  return locale === 'en' ? EN_CONTENT : AR_CONTENT;
}
