import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../auth/types/auth-user.type.js';
import { CreateReviewDto, ReviewsQueryDto } from './dto/create-review.dto.js';
import { ReviewsService } from './reviews.service.js';

@Controller()
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('projects/:projectId/review')
  submit(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.submitReview(
      user.id,
      user.role,
      projectId,
      dto,
    );
  }

  @Get('projects/:projectId/review-status')
  reviewStatus(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.reviewsService.getProjectReviewStatus(user.id, projectId);
  }

  @Public()
  @Get('freelancers/:username/reviews')
  listFreelancerReviews(
    @Param('username') username: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.listFreelancerReviews(username, query);
  }

  @Public()
  @Get('clients/:username/reviews')
  listClientReviews(
    @Param('username') username: string,
    @Query() query: ReviewsQueryDto,
  ) {
    return this.reviewsService.listClientReviews(username, query);
  }
}
