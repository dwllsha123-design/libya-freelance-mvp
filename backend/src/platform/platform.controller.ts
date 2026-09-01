import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator.js';
import { PlatformService } from './platform.service.js';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Public()
  @Get('stats')
  getStats() {
    return this.platformService.getPublicStats();
  }

  @Public()
  @Get('payment-config')
  getPaymentConfig() {
    return this.platformService.getPaymentConfig();
  }
}
