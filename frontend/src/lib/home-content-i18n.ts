import type { AppLocale } from '@/i18n/routing';
import { LIBYAN_CITIES, MARKETPLACE_CATEGORIES } from '@/lib/marketplace-content';

const HOME_CONTENT = {
  ar: {
    painPoints: {
      title: 'العثور على المستقل المناسب لا يجب أن يكون مقامرة.',
      subtitle:
        'سواء كنت شركة تبحث عن مواهب أو مستقل يبحث عن فرص حقيقية — الطريقة القديمة لم تعد تعمل في السوق الليبي.',
      client: {
        label: 'كصاحب عمل',
        items: [
          'إضاعة ساعات في فرز عروض غير مؤهلة على كل مشروع',
          'التعامل مع مستقلين لا يفهمون السوق والسياق الليبي',
          'لا حماية للدفع عندما تسوء الأمور',
          'صعوبة التحقق من مستوى المهارة قبل الالتزام',
        ],
      },
      freelancer: {
        label: 'كمستقل',
        items: [
          'المنافسة مع عشرات العروض غير الجادة على كل مشروع',
          'عملاء يختفون بعد أن تستثمر وقتاً في عروضك',
          'منصات تأخذ عمولات كبيرة من كل دفعة',
          'لا طريقة لبناء سمعة محلية يثق بها أصحاب المشاريع',
        ],
      },
    },
    features: [
      { title: 'دفع مضمون بالضمان', body: 'يُحجز مبلغ المشروع بالدينار الليبي حتى تُوافق على التسليم — أمان للطرفين.', icon: '🛡️' },
      { title: 'نظام تقييم أعمى', body: 'يُقيّم الطرفان قبل نشر التقييم — لتقليل التحيّز وبناء ثقة حقيقية.', icon: '⭐' },
      { title: 'مراسلة فورية', body: 'تواصل، شارك الملفات، وتابع المحادثات داخل المنصة دون فقدان السياق.', icon: '⚡' },
      { title: 'عروض مخصّصة بجودة', body: 'ملفات مكتملة وعروض واضحة بالدينار — أقل ضجيجاً وإشارة أوضح للعملاء الجادّين.', icon: '📋' },
      { title: 'ملفات موثقة', body: 'شارات موثوقية ومعرض أعمال وتقييمات — لتختار بثقة من مجتمعك الليبي.', icon: '🔒' },
      { title: 'تحليلات الأداء', body: 'تتبّع معدلات الإنجاز ورضا العملاء واتجاهات أرباحك على المنصة.', icon: '📈' },
    ],
    steps: {
      title: 'من التسجيل إلى التسليم في ثلاث خطوات.',
      subtitle: 'لا إعداد معقد. فقط نتائج في السوق الليبي.',
      items: [
        { step: '01', title: 'أنشئ حسابك', body: 'سجّل في دقائق واضبط ملفك كعميل أو مستقل. بدون رسوم للبدء.', badge: 'جاهز للتوظيف أو العمل' },
        { step: '02', title: 'اعثر على تطابقاتك', body: 'انشر مشروعاً أو قدّم عرضاً. ميزانيات واضحة بالدينار الليبي تجذب الجادّين.', badge: 'أقل ضجيجاً، إشارة أوضح' },
        { step: '03', title: 'سلّم، استلم أجرك، تطوّر', body: 'العمل مضمون بالضمان. السمعة تُبنى مع كل مهمة مكتملة في ليبيا.', badge: 'ثقة تتراكم' },
      ],
    },
    audience: {
      clients: {
        cta: 'ابدأ التوظيف مجاناً',
        items: [
          'الوصول إلى مجموعة من المستقلين الليبيين الموثقين',
          'تصفّح الملفات والتقييمات قبل الالتزام',
          'انشر مشروعك مجاناً بالدينار الليبي',
          'ادفع عبر الضمان عند الموافقة على العمل',
          'تقييمات أعمى لبناء ثقة حقيقية',
          'دعم مخصص عند النزاعات',
        ],
      },
      freelancers: {
        cta: 'ابدأ الكسب',
        items: [
          'اعثر على مشاريع من شركات ليبية موثقة كل يوم',
          'عملاء جادّون — قدّم عروضاً مخصصة بالدينار',
          'استلم مدفوعات مضمونة بالضمان على كل مشروع',
          'ابنِ ملفاً وسمعة يهمان فعلاً في السوق المحلي',
          'مراسلة فورية حتى لا تفقد محادثة مهمة',
          'زِد فرصك بإكمال ملفك ومعرض أعمالك',
        ],
      },
    },
    trustBadges: [
      'مدفوعات مضمونة بالضمان',
      'نظام تقييم أعمى',
      'ملفات مستقلين موثقة',
      'آمن وخاص',
      'إشعارات فورية',
      'مراسلة مدمجة',
    ],
    faq: [
      { q: 'كيف يعمل نظام نقاطي؟', a: 'نقاطي مخصصة للمستقلين: تكسبها بالنشاط وتُستخدم لتقديم العروض (10 نقاط لكل عرض). راجع صفحة نقاطي من لوحة التحكم.' },
      { q: 'هل الانضمام مجاني؟', a: 'نعم. التسجيل والتصفح مجانيان. تدفع فقط عند قبول عرض والتمويل عبر نظام الضمان بالدينار الليبي.' },
      { q: 'كيف يعمل نظام الضمان؟', a: 'عند قبول عرض، يُحجز مبلغ المشروع (د.ل) في الضمان. يُحرَّر للمستقل عند تأكيد إتمام العمل، أو يُعاد للعميل عند الاسترداد حسب سياسة المنصة.' },
      { q: 'هل المدفوعات آمنة؟', a: 'نعم. الضمان يحمي الطرفين: العميل لا يدفع مباشرة دون حماية، والمستقل يضمن وجود المبلغ قبل البدء.' },
      { q: 'هل يمكنني العمل كعميل ومستقل؟', a: 'نعم. حساب واحد للدورين. بدّل بين وضع العميل والمستقل من لوحة التحكم في أي وقت.' },
      { q: 'كيف تبقى التقييمات صادقة؟', a: 'نستخدم تقييماً أعمى: لا يُنشر تقييم أحد الطرفين حتى يقيّم الطرف الآخر — لتقليل الانتقام أو المجاملة.' },
      { q: 'ماذا يحدث في حال نزاع؟', a: 'يمكن فتح نزاع على الضمان. يراجع فريق الإدارة الأدلة ويتخذ قراراً عادلاً بين استرداد العميل أو تحرير المبلغ للمستقل.' },
    ],
    freelancersSection: {
      subtitle: 'ملفات موثقة، تقييمات حقيقية، جاهزون للتوظيف في ليبيا',
      browseAll: 'تصفّح جميع المواهب',
    },
    projectsSection: {
      title: 'فرص عمل حر في ليبيا',
      subtitle: 'أحدث المشاريع المنشورة — الميزانيات بالدينار الليبي (د.ل)',
      browseAll: 'تصفّح جميع المشاريع',
    },
    ctaFooter: {
      title: 'مشروع جديد في ليبيا؟',
      subtitle: 'انشر إعلانك بالدينار الليبي — صِف ما تحتاجه في طرابلس أو أي مدينة، وسنُحضّر لك مسودة جاهزة',
    },
    howItWorks: {
      title: 'كيف يعمل {brand}؟',
      subtitle: 'ثلاث خطوات بسيطة — من التصفح في ليبيا إلى إنجاز المشروع بالدينار الليبي',
      detailedGuide: 'دليل مفصّل',
      escrow: 'نظام الضمان',
      about: 'من نحن',
    },
    faqSection: {
      subtitle: 'كل ما تحتاج معرفته قبل البدء.',
      moreHelp: 'المزيد في مركز المساعدة',
    },
    audienceTabs: {
      clients: '💼 للعملاء',
      freelancers: '👤 للمستقلين',
    },
    resources: {
      title: 'موارد لتوظيف المستقلين الليبيين',
      subtitle: 'أدلة وأسئلة شائعة وشرح الضمان بلغة واضحة.',
      links: [
        { label: 'الأدلة', href: '/how-it-works' },
        { label: 'الأسئلة الشائعة', href: '/help' },
        { label: 'حماية الضمان', href: '/escrow' },
      ],
    },
  },
  en: {
    painPoints: {
      title: "Finding the right freelancer shouldn't be a gamble.",
      subtitle:
        "Whether you're a company looking for talent or a freelancer seeking real opportunities — the old way no longer works in the Libyan market.",
      client: {
        label: 'As a client',
        items: [
          'Wasting hours sorting unqualified proposals on every project',
          "Dealing with freelancers who don't understand the Libyan market and context",
          'No payment protection when things go wrong',
          'Hard to verify skill level before committing',
        ],
      },
      freelancer: {
        label: 'As a freelancer',
        items: [
          'Competing with dozens of low-quality proposals on every project',
          'Clients who disappear after you invest time in your proposal',
          'Platforms taking large commissions from every payment',
          'No way to build a local reputation clients trust',
        ],
      },
    },
    features: [
      { title: 'Escrow-protected payments', body: 'Project funds in Libyan Dinar are held until you approve delivery — safety for both sides.', icon: '🛡️' },
      { title: 'Blind review system', body: 'Both parties review before ratings go live — reducing bias and building real trust.', icon: '⭐' },
      { title: 'Instant messaging', body: 'Communicate, share files, and keep conversations in-platform without losing context.', icon: '⚡' },
      { title: 'Quality custom proposals', body: 'Complete profiles and clear LYD proposals — less noise, stronger signal for serious clients.', icon: '📋' },
      { title: 'Verified profiles', body: 'Trust badges, portfolios, and reviews — choose confidently from your Libyan community.', icon: '🔒' },
      { title: 'Performance analytics', body: 'Track completion rates, client satisfaction, and earnings trends on the platform.', icon: '📈' },
    ],
    steps: {
      title: 'From sign-up to delivery in three steps.',
      subtitle: 'No complex setup. Just results in the Libyan market.',
      items: [
        { step: '01', title: 'Create your account', body: 'Sign up in minutes and set up your client or freelancer profile. Free to start.', badge: 'Ready to hire or work' },
        { step: '02', title: 'Find your matches', body: 'Post a project or submit a proposal. Clear LYD budgets attract serious people.', badge: 'Less noise, clearer signal' },
        { step: '03', title: 'Deliver, get paid, grow', body: 'Work is escrow-protected. Reputation builds with every completed job in Libya.', badge: 'Trust compounds' },
      ],
    },
    audience: {
      clients: {
        cta: 'Start hiring free',
        items: [
          'Access a pool of verified Libyan freelancers',
          'Browse profiles and reviews before committing',
          'Post your project free in Libyan Dinar',
          'Pay through escrow when you approve the work',
          'Blind reviews for genuine trust',
          'Dedicated support for disputes',
        ],
      },
      freelancers: {
        cta: 'Start earning',
        items: [
          'Find projects from verified Libyan companies every day',
          'Serious clients — submit tailored LYD proposals',
          'Get escrow-guaranteed payments on every project',
          'Build a profile and reputation that matter locally',
          'Instant messaging so you never lose an important conversation',
          'Boost your chances by completing your profile and portfolio',
        ],
      },
    },
    trustBadges: [
      'Escrow-guaranteed payments',
      'Blind review system',
      'Verified freelancer profiles',
      'Secure and private',
      'Real-time notifications',
      'Built-in messaging',
    ],
    faq: [
      { q: 'How does Nuqati work?', a: 'Nuqati is for freelancers: earn points through activity and use them to submit proposals (10 points per proposal). See your Nuqati page in the dashboard.' },
      { q: 'Is joining free?', a: 'Yes. Registration and browsing are free. You only pay when you accept a proposal and fund escrow in Libyan Dinar.' },
      { q: 'How does escrow work?', a: 'When you accept a proposal, the project amount (LYD) is held in escrow. It is released to the freelancer when work is confirmed, or refunded to the client per platform policy.' },
      { q: 'Are payments secure?', a: "Yes. Escrow protects both sides: clients don't pay unprotected, and freelancers know funds exist before starting." },
      { q: 'Can I work as both client and freelancer?', a: 'Yes. One account for both roles. Switch between client and freelancer mode from the dashboard anytime.' },
      { q: 'How do reviews stay honest?', a: "We use blind reviews: neither party's rating is published until the other reviews — reducing retaliation or flattery." },
      { q: 'What happens in a dispute?', a: 'You can open an escrow dispute. Our admin team reviews evidence and decides fairly between client refund or freelancer release.' },
    ],
    freelancersSection: {
      subtitle: 'Verified profiles, real reviews, ready to hire in Libya',
      browseAll: 'Browse all talent',
    },
    projectsSection: {
      title: 'Freelance opportunities in Libya',
      subtitle: 'Latest published projects — budgets in Libyan Dinar (LYD)',
      browseAll: 'Browse all projects',
    },
    ctaFooter: {
      title: 'New project in Libya?',
      subtitle: "Post your listing in Libyan Dinar — describe what you need in Tripoli or any city, and we'll prepare a ready draft",
    },
    howItWorks: {
      title: 'How does {brand} work?',
      subtitle: 'Three simple steps — from browsing in Libya to completing projects in Libyan Dinar',
      detailedGuide: 'Detailed guide',
      escrow: 'Escrow system',
      about: 'About us',
    },
    faqSection: {
      subtitle: 'Everything you need to know before getting started.',
      moreHelp: 'More in the help center',
    },
    audienceTabs: {
      clients: '💼 For clients',
      freelancers: '👤 For freelancers',
    },
    resources: {
      title: 'Resources for hiring Libyan freelancers',
      subtitle: 'Guides, FAQs, and escrow explained in plain language.',
      links: [
        { label: 'Guides', href: '/how-it-works' },
        { label: 'FAQ', href: '/help' },
        { label: 'Escrow protection', href: '/escrow' },
      ],
    },
  },
} as const;

export function getHomeContent(locale: AppLocale) {
  return HOME_CONTENT[locale];
}

export function getHomeCities() {
  return LIBYAN_CITIES.slice(0, 8);
}

export function getHomeCategories() {
  return MARKETPLACE_CATEGORIES.slice(0, 8);
}
