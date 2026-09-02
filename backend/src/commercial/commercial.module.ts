import { Module } from '@nestjs/common';
import { CommercialAuditService } from './commercial-audit.service.js';
import { CommissionResolutionService } from './commission-resolution.service.js';

@Module({
  providers: [CommercialAuditService, CommissionResolutionService],
  exports: [CommercialAuditService, CommissionResolutionService],
})
export class CommercialModule {}
