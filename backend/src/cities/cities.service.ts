import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CitiesService {
  constructor(private readonly prisma: PrismaService) {}

  listActiveCities() {
    return this.prisma.city.findMany({
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
}
