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
          'صعوبة الاتفاق والدفع مباشرة دون وسيط تقني واضح',
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
      { title: 'دفع مباشر بين الطرفين', body: 'يتفق العميل والمستقل على طريقة وقيمة الدفع مباشرة خارج المنصة، بينما توفر ليبي فريلانس أدوات البحث والعروض والتواصل وإدارة الاتفاق.', icon: '🤝' },
      { title: 'نظام تقييم أعمى', body: 'يُقيّم الطرفان قبل نشر التقييم — لتقليل التحيّز وبناء ثقة حقيقية.', icon: '⭐' },
      { title: 'مراسلة فورية', body: 'تواصل، شارك الملفات، وتابع المحادثات داخل المنصة دون فقدان السياق.', icon: '⚡' },
      { title: 'عروض مخصّصة بجودة', body: 'ملفات مكتملة وعروض واضحة بالدينار — أقل ضجيجاً وإشارة أوضح للعملاء الجادّين.', icon: '📋' },
      { title: 'ملفات موثقة', body: 'شارات موثوقية ومعرض أعمال وتقييمات — لتختار بثقة من مجتمعك الليبي.', icon: '🔒' },
      { title: 'باقات للمستقلين', body: 'فترة تجريبية ثم باقات Starter وPro وPremium بحدود عروض واضحة — والدفع الإلكتروني للمنصة مخصص لاشتراكات المستقلين فقط.', icon: '📦' },
    ],
    steps: {
      title: 'من التسجيل إلى التسليم في ثلاث خطوات.',
      subtitle: 'لا إعداد معقد. فقط نتائج في السوق الليبي.',
      items: [
        { step: '01', title: 'أنشئ حسابك', body: 'سجّل في دقائق واضبط ملفك كعميل أو مستقل. بدون رسوم للبدء.', badge: 'جاهز للتوظيف أو العمل' },
        { step: '02', title: 'اعثر على تطابقاتك', body: 'انشر مشروعاً أو قدّم عرضاً. ميزانيات واضحة بالدينار الليبي تجذب الجادّين.', badge: 'أقل ضجيجاً، إشارة أوضح' },
        { step: '03', title: 'سلّم، استلم أجرك، تطوّر', body: 'أنجز العمل وابنِ سمعتك. الدفع لمشروعك يتم مباشرة بينك وبين الطرف الآخر.', badge: 'ثقة تتراكم' },
      ],
    },
    audience: {
      clients: {
        cta: 'ابدأ التوظيف مجاناً',
        items: [
          'الوصول إلى مجموعة من المستقلين الليبيين الموثقين',
          'تصفّح الملفات والتقييمات قبل الالتزام',
          'انشر مشروعك مجاناً بالدينار الليبي',
          'ادفع للمستقل مباشرة — المنصة لا تحتفظ بقيمة المشروع',
          'تقييمات أعمى لبناء ثقة حقيقية',
          'دعم عبر صفحة اتصل بنا',
        ],
      },
      freelancers: {
        cta: 'ابدأ الكسب',
        items: [
          'اعثر على مشاريع من شركات ليبية موثقة كل يوم',
          'عملاء جادّون — قدّم عروضاً مخصصة بالدينار',
          'فترة تجريبية ثم باقات واضحة لتقديم العروض',
          'ابنِ ملفاً وسمعة يهمان فعلاً في السوق المحلي',
          'مراسلة فورية حتى لا تفقد محادثة مهمة',
          'زِد فرصك بإكمال ملفك ومعرض أعمالك',
        ],
      },
    },
    trustBadges: [
      'دفع مباشر بين الطرفين',
      'نظام تقييم أعمى',
      'ملفات مستقلين موثقة',
      'آمن وخاص',
      'إشعارات فورية',
      'مراسلة مدمجة',
    ],
    faq: [
      { q: 'كيف يعمل نظام نقاطي؟', a: 'نقاطي مخصصة للمستقلين: تكسبها بالنشاط على المنصة (مثل إكمال الملف وتقديم العروض) وتُستخدم لتقديم العروض. لا يمكن شراء النقاط — الاكتساب عبر النشاط فقط. راجع صفحة النقاط من الحساب.' },
      { q: 'هل الانضمام مجاني؟', a: 'نعم. التسجيل والتصفح مجانيان لمدة تجريبية للمستقلين. الميزانيات والعروض بالدينار الليبي.' },
      { q: 'كيف يتم دفع قيمة المشاريع؟', a: 'ليبي فريلانس منصة إعلانية ووسيط تقني لربط العملاء بالمستقلين. المنصة لا تستلم قيمة المشاريع ولا تحتفظ بأموال الأطراف ولا تضمن تنفيذ أو سداد قيمة المشروع. يتم الاتفاق والدفع مباشرة بين العميل والمستقل.' },
      { q: 'هل المدفوعات الإلكترونية مفعّلة الآن؟', a: 'الدفع الإلكتروني داخل ليبي فريلانس مخصص فقط لاشتراكات المستقلين الشهرية التي تقدمها المنصة.' },
      { q: 'هل يمكنني العمل كعميل ومستقل؟', a: 'نعم. حساب واحد للدورين. بدّل بين وضع العميل والمستقل من لوحة التحكم في أي وقت.' },
      { q: 'كيف تبقى التقييمات صادقة؟', a: 'نستخدم تقييماً أعمى: لا يُنشر تقييم أحد الطرفين حتى يقيّم الطرف الآخر — لتقليل الانتقام أو المجاملة.' },
      { q: 'ماذا يحدث في حال نزاع؟', a: 'يمكنك التواصل مع فريق الدعم عبر صفحة اتصل بنا. قيمة المشروع تُدار مباشرة بين الطرفين خارج حجز أموال المنصة.' },
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
      escrow: 'باقات المستقلين',
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
      subtitle: 'أدلة وأسئلة شائعة وباقات الاشتراك.',
      links: [
        { label: 'الأدلة', href: '/how-it-works' },
        { label: 'الأسئلة الشائعة', href: '/help' },
        { label: 'باقات المستقلين', href: '/pricing' },
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
          'Hard to arrange direct payment without a clear technical intermediary',
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
      { title: 'Direct Payment Between Parties', body: 'Clients and freelancers arrange project payments directly. Libyan Freelance provides discovery, proposals, communication and marketplace tools.', icon: '🤝' },
      { title: 'Blind review system', body: 'Both parties review before ratings go live — reducing bias and building real trust.', icon: '⭐' },
      { title: 'Instant messaging', body: 'Communicate, share files, and keep conversations in-platform without losing context.', icon: '⚡' },
      { title: 'Quality custom proposals', body: 'Complete profiles and clear LYD proposals — less noise, stronger signal for serious clients.', icon: '📋' },
      { title: 'Verified profiles', body: 'Trust badges, portfolios, and reviews — choose confidently from your Libyan community.', icon: '🔒' },
      { title: 'Freelancer plans', body: 'A free trial, then Starter, Pro, and Premium with clear proposal quotas — platform payments cover freelancer monthly subscriptions only.', icon: '📦' },
    ],
    steps: {
      title: 'From sign-up to delivery in three steps.',
      subtitle: 'No complex setup. Just results in the Libyan market.',
      items: [
        { step: '01', title: 'Create your account', body: 'Sign up in minutes and set up your client or freelancer profile. Free to start.', badge: 'Ready to hire or work' },
        { step: '02', title: 'Find your matches', body: 'Post a project or submit a proposal. Clear LYD budgets attract serious people.', badge: 'Less noise, clearer signal' },
        { step: '03', title: 'Deliver, get paid, grow', body: 'Complete the work and build your reputation. Project payment is arranged directly between you and the other party.', badge: 'Trust compounds' },
      ],
    },
    audience: {
      clients: {
        cta: 'Start hiring free',
        items: [
          'Access a pool of verified Libyan freelancers',
          'Browse profiles and reviews before committing',
          'Post your project free in Libyan Dinar',
          'Pay the freelancer directly — the platform does not hold project funds',
          'Blind reviews for genuine trust',
          'Support via the contact page',
        ],
      },
      freelancers: {
        cta: 'Start earning',
        items: [
          'Find projects from verified Libyan companies every day',
          'Serious clients — submit tailored LYD proposals',
          'Free trial, then clear plans for submitting proposals',
          'Build a profile and reputation that matter locally',
          'Instant messaging so you never lose an important conversation',
          'Boost your chances by completing your profile and portfolio',
        ],
      },
    },
    trustBadges: [
      'Direct payment between parties',
      'Blind review system',
      'Verified freelancer profiles',
      'Secure and private',
      'Real-time notifications',
      'Built-in messaging',
    ],
    faq: [
      { q: 'How does Nuqati work?', a: 'Nuqati is for freelancers: earn points through activity on the platform (such as completing your profile and submitting proposals) and use them to submit proposals. Points cannot be purchased — they are earned through activity only. See your points page under Account.' },
      { q: 'Is joining free?', a: 'Yes. Registration and browsing are free, with a freelancer trial period. Budgets and proposals are in Libyan Dinar.' },
      { q: 'How are project payments handled?', a: 'Libyan Freelance is an advertising platform and technical intermediary connecting clients with freelancers. The platform does not receive project payment amounts, does not hold parties\' funds, and does not guarantee project delivery or payment. Agreement and payment are made directly between the client and the freelancer.' },
      { q: 'Are electronic payments live now?', a: 'Electronic payments inside Libyan Freelance are only for freelancer monthly subscriptions offered by the platform.' },
      { q: 'Can I work as both client and freelancer?', a: 'Yes. One account for both roles. Switch between client and freelancer mode from the dashboard anytime.' },
      { q: 'How do reviews stay honest?', a: "We use blind reviews: neither party's rating is published until the other reviews — reducing retaliation or flattery." },
      { q: 'What happens in a dispute?', a: 'Contact our support team via the contact page. Project value is handled directly between the parties outside any platform fund hold.' },
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
      escrow: 'Freelancer plans',
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
      subtitle: 'Guides, FAQs, and subscription plans.',
      links: [
        { label: 'Guides', href: '/how-it-works' },
        { label: 'FAQ', href: '/help' },
        { label: 'Freelancer plans', href: '/pricing' },
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
