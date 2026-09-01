import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller.js';
import { ProfilesService } from './profiles.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { PortfolioModule } from '../portfolio/portfolio.module.js';
import { ReviewsModule } from '../reviews/reviews.module.js';

@Module({
  imports: [StorageModule, PortfolioModule, ReviewsModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
