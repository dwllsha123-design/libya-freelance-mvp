import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCities(country?: string) {
    return this.prisma.city.findMany({
      where: {
        isActive: true,
        ...(country
          ? {
              OR: [{ country }, { isRemote: true }],
            }
          : {}),
      },
      orderBy: [{ country: 'asc' }, { sortOrder: 'asc' }],
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        slug: true,
        country: true,
        isRemote: true,
        sortOrder: true,
      },
    });
  }
}
