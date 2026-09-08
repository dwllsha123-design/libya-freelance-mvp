import { Module, forwardRef } from '@nestjs/common';
import { CommercialAuditService } from './commercial-audit.service.js';
import { CommissionResolutionService } from './commission-resolution.service.js';
import { LaunchModule } from '../launch/launch.module.js';

@Module({
  imports: [forwardRef(() => LaunchModule)],
  providers: [CommercialAuditService, CommissionResolutionService],
  exports: [CommercialAuditService, CommissionResolutionService],
})
export class CommercialModule {}
