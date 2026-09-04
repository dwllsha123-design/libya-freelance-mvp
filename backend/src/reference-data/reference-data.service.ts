import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { seedReferenceData } from './seed-reference-data.js';

/**
 * Ensures categories, skills, and cities exist after deploy.
 * Production Railway DBs may ship with migrations only (empty reference tables).
 */
@Injectable()
export class ReferenceDataService implements OnModuleInit {
  private readonly logger = new Logger(ReferenceDataService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.ensureReferenceData();
    } catch (error) {
      this.logger.warn(
        `Reference data ensure skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async ensureReferenceData() {
    const [cityCount, skillCount, categoryCount] = await Promise.all([
      this.prisma.city.count(),
      this.prisma.skill.count(),
      this.prisma.category.count(),
    ]);

    if (cityCount > 0 && skillCount > 0 && categoryCount > 0) {
      return { seeded: false, cityCount, skillCount, categoryCount };
    }

    this.logger.log(
      `Reference data incomplete (cities=${cityCount}, skills=${skillCount}, categories=${categoryCount}) — seeding`,
    );
    await seedReferenceData(this.prisma);

    const [cities, skills, categories] = await Promise.all([
      this.prisma.city.count(),
      this.prisma.skill.count(),
      this.prisma.category.count(),
    ]);

    this.logger.log(
      `Reference data ready (cities=${cities}, skills=${skills}, categories=${categories})`,
    );
    return { seeded: true, cityCount: cities, skillCount: skills, categoryCount: categories };
  }
}
