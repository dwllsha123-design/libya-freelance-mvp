import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReferenceDataService } from '../reference-data/reference-data.service.js';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listActiveCities() {
    let cities = await this.prisma.city.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        nameAr: true,
        slug: true,
        isRemote: true,
        sortOrder: true,
      },
    });

    if (cities.length === 0) {
      await this.referenceData.ensureReferenceData();
      cities = await this.prisma.city.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          nameAr: true,
          slug: true,
          isRemote: true,
          sortOrder: true,
        },
      });
    }

    return cities;
  }
}
