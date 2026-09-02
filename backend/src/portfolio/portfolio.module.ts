import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module.js';
import { NuqatiModule } from '../nuqati/nuqati.module.js';
import { PlatformModule } from '../platform/platform.module.js';
import { PortfolioController } from './portfolio.controller.js';
import { PortfolioService } from './portfolio.service.js';

@Module({
  imports: [StorageModule, NuqatiModule, PlatformModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
  exports: [PortfolioService],
})
export class PortfolioModule {}
