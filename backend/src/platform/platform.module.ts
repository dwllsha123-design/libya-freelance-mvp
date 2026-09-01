import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payment.module.js';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';

@Module({
  imports: [PaymentsModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
