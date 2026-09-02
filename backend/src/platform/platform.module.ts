import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payment.module.js';
import { CommercialModule } from '../commercial/commercial.module.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';
import { PlatformPolicyService } from './platform-policy.service.js';
import { PlatformCmsService } from './platform-cms.service.js';

@Module({
  imports: [PaymentsModule, CommercialModule],
  controllers: [PlatformController],
  providers: [PlatformService, PlatformPolicyService, PlatformCmsService],
  exports: [PlatformPolicyService, PlatformCmsService, PlatformService],
})
export class PlatformModule {}
