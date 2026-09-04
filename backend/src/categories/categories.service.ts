import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReferenceDataService } from '../reference-data/reference-data.service.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listActiveCategories() {
    let categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        nameAr: true,
        slug: true,
        description: true,
        sortOrder: true,
      },
    });

    if (categories.length === 0) {
      await this.referenceData.ensureReferenceData();
      categories = await this.prisma.category.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          nameAr: true,
          slug: true,
          description: true,
          sortOrder: true,
        },
      });
    }

    return categories;
  }
}
