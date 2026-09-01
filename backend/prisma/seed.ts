import { PrismaClient } from '@prisma/client';
import { seedReferenceData } from './seed-reference.js';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === 'production' && process.env.SEED_DEMO_DATA === 'true') {
    console.warn(
      'Reference seed running in production. Demo accounts are NOT created by this command.',
    );
  }

  await seedReferenceData(prisma);
  console.log('Reference seed completed (categories, skills, cities).');
  console.log(
    'For demo users/projects, run: npm run prisma:seed:demo (development only)',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
