import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ProjectStatus,
  Role,
} from '@prisma/client';
import { normalizeUsername } from '../common/utils/username.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateReviewDto, ReviewsQueryDto } from './dto/create-review.dto.js';
import { ReviewRatingService } from './review-rating.service.js';
import {
  deriveReviewTarget,
  validateRating,
  validateReviewComment,
} from './review-validation.util.js';

const reviewInclude = {
  reviewer: {
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
          profilePhoto: true,
        },
      },
    },
  },
  project: {
    select: { title: true, slug: true },
  },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly ratingService: ReviewRatingService,
  ) {}

  async submitReview(userId: string, role: Role, projectId: string, dto: CreateReviewDto) {
    const project = await this.getProjectReviewContext(projectId);
    const reviewedUserId = deriveReviewTarget(userId, role, project);

    if (reviewedUserId === userId) {
      throw new ForbiddenException('لا يمكنك تقييم نفسك');
    }

    const rating = validateRating(dto.rating);
    const comment = validateReviewComment(dto.comment);

    try {
      const review = await this.prisma.$transaction(async (tx) => {
        const created = await tx.review.create({
          data: {
            projectId,
            reviewerId: userId,
            reviewedUserId,
            rating,
            comment,
          },
          include: reviewInclude,
        });

        await this.ratingService.refreshForUser(reviewedUserId, tx);

        return created;
      });

      const reviewedProfile = await this.prisma.profile.findFirst({
        where: { userId: reviewedUserId },
        select: {
          username: true,
          user: { select: { role: true } },
        },
      });

      const targetUrl =
        reviewedProfile?.user.role === Role.CLIENT
          ? `/clients/${reviewedProfile.username}`
          : reviewedProfile
            ? `/freelancers/${reviewedProfile.username}`
            : '/dashboard';

      await this.notifications.create(
        reviewedUserId,
        NotificationType.NEW_REVIEW,
        'تقييم جديد',
        `تم تقييمك في مشروع "${review.project.title}"`,
        targetUrl,
      );

      return this.formatReview(review);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('لقد قمت بالتقييم مسبقاً لهذا المشروع');
      }

      throw error;
    }
  }

  async getProjectReviewStatus(userId: string, projectId: string) {
    const project = await this.getProjectReviewContext(projectId);

    const isClient = userId === project.clientId;
    const isFreelancer =
      project.acceptedProposal?.freelancerId === userId;

    if (!isClient && !isFreelancer) {
      throw new ForbiddenException('غير مصرح');
    }

    const existing = await this.prisma.review.findFirst({
      where: { projectId, reviewerId: userId },
    });

    let canReview = project.status === ProjectStatus.COMPLETED && !existing;

    try {
      if (canReview) {
        deriveReviewTarget(
          userId,
          isClient ? Role.CLIENT : Role.FREELANCER,
          project,
        );
      }
    } catch {
      canReview = false;
    }

    return {
      projectId,
      status: project.status,
      canReview,
      hasReviewed: Boolean(existing),
      myReview: existing
        ? {
            rating: existing.rating,
            comment: existing.comment,
            createdAt: existing.createdAt,
          }
        : null,
    };
  }

  async listFreelancerReviews(username: string, query: ReviewsQueryDto) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: normalizeUsername(username),
        user: { role: Role.FREELANCER, status: 'ACTIVE' },
      },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException('المستقل غير موجود');
    }

    return this.listReceivedReviews(profile.userId, query);
  }

  async listClientReviews(username: string, query: ReviewsQueryDto) {
    const profile = await this.prisma.profile.findFirst({
      where: {
        username: normalizeUsername(username),
        user: { role: Role.CLIENT, status: 'ACTIVE' },
      },
      select: { userId: true },
    });

    if (!profile) {
      throw new NotFoundException('العميل غير موجود');
    }

    return this.listReceivedReviews(profile.userId, query);
  }

  async getRatingSummary(userId: string) {
    const aggregate = await this.prisma.review.aggregate({
      where: { reviewedUserId: userId, isVisible: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const latest = await this.prisma.review.findMany({
      where: { reviewedUserId: userId, isVisible: true },
      include: reviewInclude,
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    return {
      ratingAverage: aggregate._avg.rating ?? 0,
      reviewCount: aggregate._count.rating,
      latestReviews: latest.map((review) => this.formatReview(review)),
    };
  }

  private async listReceivedReviews(userId: string, query: ReviewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = { reviewedUserId: userId, isVisible: true };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      items: items.map((review) => this.formatReview(review)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async getProjectReviewContext(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        acceptedProposal: {
          select: { id: true, status: true, freelancerId: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('المشروع غير موجود');
    }

    return {
      status: project.status,
      clientId: project.clientId,
      acceptedProposalId: project.acceptedProposalId,
      acceptedProposal: project.acceptedProposal,
    };
  }

  private formatReview(
    review: Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>,
  ) {
    const profile = review.reviewer.profile;

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      reviewer: profile
        ? {
            username: profile.username,
            displayName: `${profile.firstName} ${profile.lastName}`,
            profilePhoto: profile.profilePhoto,
          }
        : null,
      project: {
        title: review.project.title,
        slug: review.project.slug,
      },
    };
  }
}
