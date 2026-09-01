import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ReviewRatingService } from './review-rating.service.js';
import { ReviewsController } from './reviews.controller.js';
import { ReviewsService } from './reviews.service.js';

@Module({
  imports: [NotificationsModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewRatingService],
  exports: [ReviewsService, ReviewRatingService],
})
export class ReviewsModule {}
