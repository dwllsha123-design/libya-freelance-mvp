import { Injectable, NotFoundException } from '@nestjs/common';
import { AdminAuditAction, Prisma } from '@prisma/client';
import { ReviewRatingService } from '../reviews/review-rating.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AdminAuditService } from './admin-audit.service.js';
import type { AdminReviewsQueryDto } from './dto/admin.dto.js';

const reviewInclude = {
  reviewer: {
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  },
  reviewedUser: {
    include: {
      profile: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
        },
      },
    },
  },
  project: { select: { id: true, title: true, slug: true } },
} satisfies Prisma.ReviewInclude;

@Injectable()
export class AdminReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly ratingService: ReviewRatingService,
  ) {}

  async list(query: AdminReviewsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (query.visible === true) where.isVisible = true;
    if (query.visible === false) where.isVisible = false;

    if (query.q?.trim()) {
      where.OR = [
        { comment: { contains: query.q.trim(), mode: 'insensitive' } },
        {
          project: {
            title: { contains: query.q.trim(), mode: 'insensitive' },
          },
        },
      ];
    }

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

  async getById(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: reviewInclude,
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود');
    }

    return this.formatReview(review);
  }

  async hide(adminId: string, reviewId: string) {
    return this.setVisibility(adminId, reviewId, false, AdminAuditAction.REVIEW_HIDDEN);
  }

  async restore(adminId: string, reviewId: string) {
    return this.setVisibility(adminId, reviewId, true, AdminAuditAction.REVIEW_RESTORED);
  }

  private async setVisibility(
    adminId: string,
    reviewId: string,
    isVisible: boolean,
    action: AdminAuditAction,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('التقييم غير موجود');
    }

    if (review.isVisible === isVisible) {
      return this.getById(reviewId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { isVisible },
      });

      await this.ratingService.recalculateUserRating(review.reviewedUserId, tx);

      await this.audit.log(
        adminId,
        action,
        'Review',
        reviewId,
        { reviewedUserId: review.reviewedUserId },
        tx,
      );
    });

    return this.getById(reviewId);
  }

  private formatReview(
    review: Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>,
  ) {
    const reviewerProfile = review.reviewer.profile;
    const reviewedProfile = review.reviewedUser.profile;

    return {
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      isVisible: review.isVisible,
      createdAt: review.createdAt,
      reviewer: reviewerProfile
        ? {
            id: review.reviewerId,
            username: reviewerProfile.username,
            displayName: `${reviewerProfile.firstName} ${reviewerProfile.lastName}`,
          }
        : null,
      reviewedUser: reviewedProfile
        ? {
            id: review.reviewedUserId,
            username: reviewedProfile.username,
            displayName: `${reviewedProfile.firstName} ${reviewedProfile.lastName}`,
          }
        : null,
      project: review.project,
    };
  }
}
