import { Injectable } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReviewRatingService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Recomputes cached averageRating from Review rows.
   * Internal maintenance helper — not exposed via HTTP.
   */
  async recalculateUserRating(
    userId: string,
    tx?: Prisma.TransactionClient,
  ) {
    return this.refreshForUser(userId, tx);
  }

  async refreshForUser(
    userId: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            freelancerProfile: true,
            clientProfile: true,
          },
        },
      },
    });

    if (!user?.profile) return;

    const aggregate = await tx.review.aggregate({
      where: { reviewedUserId: userId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const average = aggregate._avg.rating ?? 0;
    const count = aggregate._count.rating;

    if (user.role === Role.FREELANCER && user.profile.freelancerProfile) {
      await tx.freelancerProfile.update({
        where: { id: user.profile.freelancerProfile.id },
        data: { averageRating: average },
      });
    }

    if (user.role === Role.CLIENT && user.profile.clientProfile) {
      await tx.clientProfile.update({
        where: { id: user.profile.clientProfile.id },
        data: { averageRating: average },
      });
    }

    return { average, count };
  }
}
