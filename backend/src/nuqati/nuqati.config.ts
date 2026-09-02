export const NUQATI_BRAND_AR = 'نقاطي';

export const NUQATI_REASON_LABELS: Record<string, string> = {
  WELCOME_BONUS: 'مكافأة الترحيب',
  DAILY_LOGIN: 'تسجيل دخول يومي',
  PROFILE_COMPLETE: 'إكمال الملف الشخصي',
  FIRST_PORTFOLIO: 'أول عنصر في معرض الأعمال',
  MONTHLY_APPLY: 'تقديم لطلب هذا الشهر',
  PROPOSAL_SUBMIT: 'تكلفة تقديم عرض',
  STREAK_7: 'سلسلة تقديمات 7 أيام',
  STREAK_15: 'سلسلة تقديمات 15 يوماً',
  STREAK_30: 'سلسلة تقديمات 30 يوماً',
  PURCHASE: 'شراء نقاط',
  FIRST_JOB: 'أول مشروع مكتمل',
  SOCIAL_SHARE: 'مشاركة على وسائل التواصل',
};

export const NUQATI_CONFIG = {
  welcomeBonus: 40,
  dailyLoginReward: 1,
  dailyLoginMonthlyCap: 15,
  proposalSubmitCost: 10,
  monthlyApplyReward: 5,
  profileCompleteReward: 10,
  firstPortfolioReward: 10,
  firstJobReward: 20,
  socialShareReward: 20,
  socialShareMonthlyCap: 2,
  streakMilestones: {
    7: 15,
    15: 25,
    30: 45,
  } as Record<number, number>,
  purchasePackages: [
    { id: 'p100', points: 100, priceLyd: 30 },
    { id: 'p250', points: 250, priceLyd: 65 },
    { id: 'p500', points: 500, priceLyd: 120 },
  ],
  monthlyEarnableFromTasks: 64,
  profileEarnable: 30,
  achievementsEarnable: 110,
  streakEarnable: 85,
} as const;

export type NuqatiTaskDefinition = {
  key: string;
  titleAr: string;
  descriptionAr: string;
  reward: number;
  maxProgress?: number;
  category: 'profile' | 'activity' | 'streak' | 'achievement' | 'social';
};

export const NUQATI_TASK_DEFINITIONS: NuqatiTaskDefinition[] = [
  {
    key: 'PROFILE_COMPLETE',
    titleAr: 'أكمل ملفك الشخصي',
    descriptionAr: 'أضف المسمى، النبذة، المهارات، والمدينة.',
    reward: NUQATI_CONFIG.profileCompleteReward,
    category: 'profile',
  },
  {
    key: 'FIRST_PORTFOLIO',
    titleAr: 'أضف عنصراً لمعرض أعمالك',
    descriptionAr: 'اعرض عملاً سابقاً لزيادة ثقة العملاء.',
    reward: NUQATI_CONFIG.firstPortfolioReward,
    category: 'profile',
  },
  {
    key: 'DAILY_LOGIN',
    titleAr: 'سجّل دخولك يومياً',
    descriptionAr: `احصل على ${NUQATI_CONFIG.dailyLoginReward} نقطة كل يوم (حد أقصى ${NUQATI_CONFIG.dailyLoginMonthlyCap}/شهر).`,
    reward: NUQATI_CONFIG.dailyLoginReward,
    maxProgress: NUQATI_CONFIG.dailyLoginMonthlyCap,
    category: 'activity',
  },
  {
    key: 'MONTHLY_APPLY',
    titleAr: 'قدّم عرضاً على مشروع',
    descriptionAr: 'قدّم عرضاً واحداً على الأقل هذا الشهر.',
    reward: NUQATI_CONFIG.monthlyApplyReward,
    maxProgress: 1,
    category: 'activity',
  },
  {
    key: 'STREAK_7',
    titleAr: 'سلسلة تقديمات 7 أيام',
    descriptionAr: 'قدّم عرضاً واحداً على الأقل كل يوم لمدة 7 أيام.',
    reward: NUQATI_CONFIG.streakMilestones[7],
    maxProgress: 7,
    category: 'streak',
  },
  {
    key: 'STREAK_15',
    titleAr: 'سلسلة تقديمات 15 يوماً',
    descriptionAr: 'استمر في التقديم يومياً لمدة 15 يوماً.',
    reward: NUQATI_CONFIG.streakMilestones[15],
    maxProgress: 15,
    category: 'streak',
  },
  {
    key: 'STREAK_30',
    titleAr: 'سلسلة تقديمات 30 يوماً',
    descriptionAr: 'أقوى سلسلة — 30 يوماً متتالية من التقديم.',
    reward: NUQATI_CONFIG.streakMilestones[30],
    maxProgress: 30,
    category: 'streak',
  },
  {
    key: 'FIRST_JOB',
    titleAr: 'أول مشروع مكتمل',
    descriptionAr: 'أكمل أول مشروع لك على المنصة.',
    reward: NUQATI_CONFIG.firstJobReward,
    category: 'achievement',
  },
  {
    key: 'SOCIAL_SHARE',
    titleAr: `شارك ${NUQATI_BRAND_AR}`,
    descriptionAr: 'انشر عن المنصة على فيسبوك أو لينكدإن واحصل على مكافأة بعد المراجعة.',
    reward: NUQATI_CONFIG.socialShareReward,
    maxProgress: NUQATI_CONFIG.socialShareMonthlyCap,
    category: 'social',
  },
];
