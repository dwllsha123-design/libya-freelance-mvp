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
          'لا نظام حماية مدفوعات جاهز بعد عندما تسوء الأمور',
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
      { title: 'نظام حماية المدفوعات — قريبًا', body: 'نعمل حاليًا على استكمال الربط مع مزودي الدفع الإلكتروني في ليبيا، لإطلاق نظام حماية مدفوعات يرفع مستوى الأمان والثقة بين العميل والمستقل.', icon: '🛡️' },
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
        { step: '03', title: 'سلّم، استلم أجرك، تطوّر', body: 'أنجز العمل وابنِ سمعتك. حماية المدفوعات قريبًا لرفع الثقة بين الطرفين في ليبيا.', badge: 'ثقة تتراكم' },
      ],
    },
    audience: {
      clients: {
        cta: 'ابدأ التوظيف مجاناً',
        items: [
          'الوصول إلى مجموعة من المستقلين الليبيين الموثقين',
          'تصفّح الملفات والتقييمات قبل الالتزام',
          'انشر مشروعك مجاناً بالدينار الليبي',
          'حماية المدفوعات قريبًا داخل المنصة',
          'تقييمات أعمى لبناء ثقة حقيقية',
          'دعم مخصص عند النزاعات',
        ],
      },
      freelancers: {
        cta: 'ابدأ الكسب',
        items: [
          'اعثر على مشاريع من شركات ليبية موثقة كل يوم',
          'عملاء جادّون — قدّم عروضاً مخصصة بالدينار',
          'نظام حماية المدفوعات قيد التجهيز — قريبًا',
          'ابنِ ملفاً وسمعة يهمان فعلاً في السوق المحلي',
          'مراسلة فورية حتى لا تفقد محادثة مهمة',
          'زِد فرصك بإكمال ملفك ومعرض أعمالك',
        ],
      },
    },
    trustBadges: [
      'حماية المدفوعات قريبًا',
      'نظام تقييم أعمى',
      'ملفات مستقلين موثقة',
      'آمن وخاص',
      'إشعارات فورية',
      'مراسلة مدمجة',
    ],
    faq: [
      { q: 'كيف يعمل نظام نقاطي؟', a: 'نقاطي مخصصة للمستقلين: تكسبها بالنشاط وتُستخدم لتقديم العروض (10 نقاط لكل عرض). راجع صفحة نقاطي من لوحة التحكم.' },
      { q: 'هل الانضمام مجاني؟', a: 'نعم. التسجيل والتصفح مجانيان. الميزانيات والعروض بالدينار الليبي. نظام حماية المدفوعات الإلكتروني قريبًا.' },
      { q: 'هل يوجد نظام حماية للمدفوعات؟', a: 'نظام حماية المدفوعات — قريبًا. نعمل حاليًا على استكمال الربط مع مزودي الدفع الإلكتروني في ليبيا، لإطلاق نظام حماية مدفوعات يرفع مستوى الأمان والثقة بين العميل والمستقل.' },
      { q: 'هل المدفوعات الإلكترونية مفعّلة الآن؟', a: 'ليس بعد. بوابة الدفع الإلكتروني وحماية المعاملات داخل المنصة قيد التجهيز وستكون متاحة قريبًا.' },
      { q: 'هل يمكنني العمل كعميل ومستقل؟', a: 'نعم. حساب واحد للدورين. بدّل بين وضع العميل والمستقل من لوحة التحكم في أي وقت.' },
      { q: 'كيف تبقى التقييمات صادقة؟', a: 'نستخدم تقييماً أعمى: لا يُنشر تقييم أحد الطرفين حتى يقيّم الطرف الآخر — لتقليل الانتقام أو المجاملة.' },
      { q: 'ماذا يحدث في حال نزاع؟', a: 'يمكنك التواصل مع فريق الدعم عبر صفحة اتصل بنا. بعد إطلاق نظام حماية المدفوعات، ستتوفر آليات نزاع مدمجة داخل المنصة.' },
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
      escrow: 'حماية المدفوعات قريبًا',
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
      subtitle: 'أدلة وأسئلة شائعة وتحديثات حول حماية المدفوعات القادمة.',
      links: [
        { label: 'الأدلة', href: '/how-it-works' },
        { label: 'الأسئلة الشائعة', href: '/help' },
        { label: 'حماية المدفوعات قريبًا', href: '/escrow' },
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
          'No live payment protection yet when things go wrong',
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
      { title: 'Payment Protection — Coming Soon', body: 'We are currently working on integrating electronic payment providers in Libya to introduce a secure payment protection system for clients and freelancers.', icon: '🛡️' },
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
        { step: '03', title: 'Deliver, get paid, grow', body: 'Complete the work and build your reputation. Payment protection is coming soon to raise trust for both sides in Libya.', badge: 'Trust compounds' },
      ],
    },
    audience: {
      clients: {
        cta: 'Start hiring free',
        items: [
          'Access a pool of verified Libyan freelancers',
          'Browse profiles and reviews before committing',
          'Post your project free in Libyan Dinar',
          'Payment protection coming soon inside the platform',
          'Blind reviews for genuine trust',
          'Dedicated support for disputes',
        ],
      },
      freelancers: {
        cta: 'Start earning',
        items: [
          'Find projects from verified Libyan companies every day',
          'Serious clients — submit tailored LYD proposals',
          'Payment protection system in progress — coming soon',
          'Build a profile and reputation that matter locally',
          'Instant messaging so you never lose an important conversation',
          'Boost your chances by completing your profile and portfolio',
        ],
      },
    },
    trustBadges: [
      'Payment protection coming soon',
      'Blind review system',
      'Verified freelancer profiles',
      'Secure and private',
      'Real-time notifications',
      'Built-in messaging',
    ],
    faq: [
      { q: 'How does Nuqati work?', a: 'Nuqati is for freelancers: earn points through activity and use them to submit proposals (10 points per proposal). See your Nuqati page in the dashboard.' },
      { q: 'Is joining free?', a: 'Yes. Registration and browsing are free. Budgets and proposals are in Libyan Dinar. Electronic payment protection is coming soon.' },
      { q: 'Is there payment protection?', a: 'Payment Protection — Coming Soon. We are currently working on integrating electronic payment providers in Libya to introduce a secure payment protection system for clients and freelancers.' },
      { q: 'Are electronic payments live now?', a: 'Not yet. The payment gateway and in-platform transaction protection are being prepared and will be available soon.' },
      { q: 'Can I work as both client and freelancer?', a: 'Yes. One account for both roles. Switch between client and freelancer mode from the dashboard anytime.' },
      { q: 'How do reviews stay honest?', a: "We use blind reviews: neither party's rating is published until the other reviews — reducing retaliation or flattery." },
      { q: 'What happens in a dispute?', a: 'Contact our support team via the contact page. After payment protection launches, built-in dispute flows will be available on the platform.' },
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
      escrow: 'Payment protection — coming soon',
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
      subtitle: 'Guides, FAQs, and updates on upcoming payment protection.',
      links: [
        { label: 'Guides', href: '/how-it-works' },
        { label: 'FAQ', href: '/help' },
        { label: 'Payment protection — coming soon', href: '/escrow' },
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
