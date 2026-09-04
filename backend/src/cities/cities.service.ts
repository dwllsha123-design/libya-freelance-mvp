import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReferenceDataService } from '../reference-data/reference-data.service.js';

@Injectable()
export class CitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referenceData: ReferenceDataService,
  ) {}

  async listActiveCities(country?: string) {
    const normalizedCountry = country?.trim() || undefined;

    let cities = await this.findCities(normalizedCountry);

    if (cities.length === 0) {
      await this.referenceData.ensureReferenceData({ forceCities: true });
      cities = await this.findCities(normalizedCountry);
    }

    return cities;
  }

  private findCities(country?: string) {
    return this.prisma.city.findMany({
      where: {
        isActive: true,
        ...(country ? { country } : {}),
      },
      orderBy: [{ country: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        nameAr: true,
        slug: true,
        country: true,
        isRemote: true,
        sortOrder: true,
      },
    });
  }
}
