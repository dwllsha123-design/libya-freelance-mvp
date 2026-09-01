import { PrismaClient, ProjectStatus, WorkMode } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

function isDemoSeedAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return true;
}

async function main() {
  if (!isDemoSeedAllowed()) {
    console.error(
      'Demo seed blocked. Set SEED_DEMO_DATA=true explicitly for non-production demo data, or run in development.',
    );
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    console.error('Demo seed is not allowed in production.');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash('Password1', 12);

  await prisma.user.upsert({
    where: { email: 'demo-admin@seed.ly' },
    update: {},
    create: {
      email: 'demo-admin@seed.ly',
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          firstName: 'مدير',
          lastName: 'تجريبي',
          username: 'demo-admin',
        },
      },
    },
  });

  const demoClient = await prisma.user.upsert({
    where: { email: 'demo-client@seed.ly' },
    update: {},
    create: {
      email: 'demo-client@seed.ly',
      passwordHash,
      role: 'CLIENT',
      status: 'ACTIVE',
      emailVerified: true,
      profile: {
        create: {
          firstName: 'عميل',
          lastName: 'تجريبي',
          username: 'demo-client',
          clientProfile: { create: {} },
        },
      },
    },
    include: { profile: true },
  });

  const category = await prisma.category.findFirst({
    where: { slug: 'programming-tech' },
  });
  const socialCategory = await prisma.category.findFirst({
    where: { slug: 'social-media' },
  });
  const reactSkill = await prisma.skill.findFirst({ where: { slug: 'react' } });
  const nextSkill = await prisma.skill.findFirst({ where: { slug: 'next-js' } });
  const nodeSkill = await prisma.skill.findFirst({ where: { slug: 'node-js' } });
  const socialSkill = await prisma.skill.findFirst({ where: { slug: 'social-media' } });
  const marketingSkill = await prisma.skill.findFirst({
    where: { slug: 'digital-marketing' },
  });
  const tripoli = await prisma.city.findFirst({ where: { slug: 'tripoli' } });

  if (demoClient.profile && category && reactSkill && nextSkill) {
    const demoProjects: Array<{
      title: string;
      description: string;
      budgetMin: number;
      budgetMax: number;
      slug: string;
      workMode: WorkMode;
      cityId?: string;
      categoryId: string;
      skillIds: string[];
    }> = [
      {
        title: 'تصميم متجر إلكتروني لبيع الملابس',
        description:
          'مشروع تجريبي: نبحث عن مصمم لإنشاء متجر إلكتروني عصري لبيع الملابس مع تجربة مستخدم سلسة ودعم اللغة العربية. يشمل تصميم الصفحة الرئيسية وصفحات المنتجات.',
        budgetMin: 2000,
        budgetMax: 5000,
        slug: 'demo-ecommerce-clothing-a1b2c3',
        workMode: WorkMode.REMOTE,
        categoryId: category.id,
        skillIds: [reactSkill.id, nextSkill.id],
      },
      {
        title: 'تطوير تطبيق توصيل',
        description:
          'مشروع تجريبي: مطلوب مطور لتطبيق توصيل محلي يعمل على Android وiOS مع لوحة تحكم للمطاعم. التكامل مع الخرائط ونظام تتبع الطلبات ضمن النطاق.',
        budgetMin: 8000,
        budgetMax: 15000,
        slug: 'demo-delivery-app-d4e5f6',
        workMode: WorkMode.HYBRID,
        cityId: tripoli?.id,
        categoryId: category.id,
        skillIds: [reactSkill.id, nextSkill.id],
      },
      {
        title: 'تصميم هوية بصرية لشركة',
        description:
          'مشروع تجريبي: نحتاج هوية بصرية كاملة تشمل الشعار والألوان والخطوط وبطاقة العمل وقوالب السوشيال ميديا لشركة ناشئة في قطاع التقنية.',
        budgetMin: 1500,
        budgetMax: 3500,
        slug: 'demo-branding-g7h8i9',
        workMode: WorkMode.REMOTE,
        categoryId: category.id,
        skillIds: [reactSkill.id, nextSkill.id],
      },
      ...(socialCategory && socialSkill && marketingSkill
        ? [
            {
              title: 'إدارة صفحات التواصل الاجتماعي',
              description:
                'مشروع تجريبي: مطلوب متخصص لإدارة حسابات فيسبوك وإنستغرام وتيك توك لعلامة تجارية محلية. يشمل إعداد خطة محتوى شهرية وتصميم منشورات ورد على التعليقات.',
              budgetMin: 800,
              budgetMax: 2000,
              slug: 'demo-social-media-j1k2l3',
              workMode: WorkMode.REMOTE,
              categoryId: socialCategory.id,
              skillIds: [socialSkill.id, marketingSkill.id],
            },
          ]
        : []),
      ...(nodeSkill
        ? [
            {
              title: 'تطوير نظام إدارة مخزون',
              description:
                'مشروع تجريبي: نبحث عن مطور لبناء نظام إدارة مخزون ويب لمستودع تجاري في ليبيا. يشمل تتبع المنتجات والتنبيهات عند انخفاض الكميات وتقارير يومية.',
              budgetMin: 5000,
              budgetMax: 12000,
              slug: 'demo-inventory-m4n5o6',
              workMode: WorkMode.ON_SITE,
              cityId: tripoli?.id,
              categoryId: category.id,
              skillIds: [nodeSkill.id, nextSkill.id],
            },
          ]
        : []),
    ];

    for (const demo of demoProjects) {
      const existing = await prisma.project.findUnique({
        where: { slug: demo.slug },
      });

      if (!existing) {
        const project = await prisma.project.create({
          data: {
            title: demo.title,
            slug: demo.slug,
            description: demo.description,
            categoryId: demo.categoryId,
            budgetMin: demo.budgetMin,
            budgetMax: demo.budgetMax,
            clientId: demoClient.id,
            status: ProjectStatus.OPEN,
            workMode: demo.workMode,
            cityId: demo.cityId ?? null,
            publishedAt: new Date(),
            skills: {
              create: demo.skillIds.map((skillId) => ({ skillId })),
            },
          },
        });
        console.log(`Demo project seeded: ${project.slug}`);
      }
    }
  }

  console.log('Demo seed completed (development only).');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
