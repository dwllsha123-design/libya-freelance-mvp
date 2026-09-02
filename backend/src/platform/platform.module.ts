import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payment.module.js';
import { CommercialModule } from '../commercial/commercial.module.js';
import { PlatformController } from './platform.controller.js';
import { ApiV1Controller } from './api-v1.controller.js';
import { PlatformService } from './platform.service.js';
import { PlatformPolicyService } from './platform-policy.service.js';
import { PlatformCmsService } from './platform-cms.service.js';
import { PlatformAppConfigService } from './platform-app-config.service.js';

@Module({
  imports: [PaymentsModule, CommercialModule],
  controllers: [PlatformController, ApiV1Controller],
  providers: [
    PlatformService,
    PlatformPolicyService,
    PlatformCmsService,
    PlatformAppConfigService,
  ],
  exports: [
    PlatformPolicyService,
    PlatformCmsService,
    PlatformService,
    PlatformAppConfigService,
  ],
})
export class PlatformModule {}
