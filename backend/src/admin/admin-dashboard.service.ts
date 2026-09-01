import { Injectable } from '@nestjs/common';
import { ProjectStatus, Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [
      totalUsers,
      freelancers,
      clients,
      suspendedUsers,
      bannedUsers,
      totalProjects,
      openProjects,
      inProgressProjects,
      completedProjects,
      totalProposals,
      totalReviews,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: Role.FREELANCER } }),
      this.prisma.user.count({ where: { role: Role.CLIENT } }),
      this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      this.prisma.user.count({ where: { status: UserStatus.BANNED } }),
      this.prisma.project.count(),
      this.prisma.project.count({ where: { status: ProjectStatus.OPEN } }),
      this.prisma.project.count({ where: { status: ProjectStatus.IN_PROGRESS } }),
      this.prisma.project.count({ where: { status: ProjectStatus.COMPLETED } }),
      this.prisma.proposal.count(),
      this.prisma.review.count(),
    ]);

    return {
      users: {
        total: totalUsers,
        freelancers,
        clients,
        suspended: suspendedUsers,
        banned: bannedUsers,
      },
      projects: {
        total: totalProjects,
        open: openProjects,
        inProgress: inProgressProjects,
        completed: completedProjects,
      },
      proposals: { total: totalProposals },
      reviews: { total: totalReviews },
    };
  }
}
