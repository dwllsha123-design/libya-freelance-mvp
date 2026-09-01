import { Module, forwardRef } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { PortfolioModule } from '../portfolio/portfolio.module.js';
import { EscrowModule } from '../escrow/escrow.module.js';
import { ProposalsController } from './proposals.controller.js';
import { ProposalsService } from './proposals.service.js';

@Module({
  imports: [NotificationsModule, PortfolioModule, forwardRef(() => EscrowModule)],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
