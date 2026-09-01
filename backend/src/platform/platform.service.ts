import { Injectable } from '@nestjs/common';
import { ProjectStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentService } from '../payments/payment.service.js';

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentService,
  ) {}

  async getPublicStats() {
    const [
      freelancers,
      clients,
      projects,
      completedProjects,
      reviewAgg,
      verifiedFreelancers,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: Role.FREELANCER, status: UserStatus.ACTIVE },
      }),
      this.prisma.user.count({
        where: { role: Role.CLIENT, status: UserStatus.ACTIVE },
      }),
      this.prisma.project.count({
        where: { status: { not: ProjectStatus.DRAFT } },
      }),
      this.prisma.project.count({
        where: { status: ProjectStatus.COMPLETED },
      }),
      this.prisma.review.aggregate({
        where: { isVisible: true },
        _avg: { rating: true },
        _count: true,
      }),
      this.prisma.freelancerProfile.count({
        where: {
          completedProjects: { gte: 1 },
          averageRating: { gte: 4 },
          skills: { some: {} },
          profile: {
            profilePhoto: { not: null },
            bio: { not: '' },
            user: {
              status: UserStatus.ACTIVE,
              emailVerified: true,
            },
          },
        },
      }),
    ]);

    const averageRating = reviewAgg._avg.rating ?? 0;
    const satisfactionPercent =
      reviewAgg._count > 0 ? Math.round((averageRating / 5) * 100) : null;

    return {
      users: freelancers + clients,
      freelancers,
      clients,
      projects,
      completedProjects,
      reviews: reviewAgg._count,
      averageRating: Number(averageRating.toFixed(1)),
      satisfactionPercent,
      verifiedFreelancers,
    };
  }

  getPaymentConfig() {
    return this.payments.getPublicConfig();
  }
}
